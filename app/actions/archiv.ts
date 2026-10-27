"use server"

// Archivieren statt Löschen (Spec §1): Objekte und Anfragen verschwinden aus Listen,
// Treffersuche und Website, bleiben aber für Archiv-Seite und Jahresrapport erhalten.
import { revalidatePath } from "next/cache"
import { after } from "next/server"
import { holeEigenesProfil } from "@/lib/queries/profile"
import { NutzerFehler } from "@/lib/nutzer-fehler"
import { archiviereAnfrage, archiviereObjekt, stelleAnfrageWiederHer, stelleObjektWiederHer } from "@/lib/queries/archiv"
import { berechneUndSpeichereMatchesFuerAnfrage, berechneUndSpeichereMatchesFuerObjekt } from "@/lib/queries/matches"
import { pruefeGrund } from "@/lib/archiv/grund"
import { idSchema, type Ergebnis } from "@/app/actions/entwuerfe-hilfen"

type ArchivErgebnis = Ergebnis & { hinweise?: string[] }

const REMATCH_HINWEIS = "Treffer werden im Hintergrund neu berechnet."

function pruefeId(id: unknown): string {
  const geprueft = idSchema.safeParse(id)
  if (!geprueft.success) throw new NutzerFehler("Ungültige ID.")
  return geprueft.data
}

function archivPfadeNeuLaden() {
  for (const pfad of ["/admin", "/admin/objekte", "/admin/anfragen", "/admin/archiv", "/objekte"]) {
    revalidatePath(pfad)
  }
  revalidatePath("/admin", "layout")
}

// Profil zuerst (Redirect bei fehlender Sitzung), dann der Schritt. NutzerFehler (Validierung,
// P0001 aus der DB) wird zu { fehler }, alles andere ist unerwartet und wirft durch.
async function ausfuehren(schritt: () => Promise<ArchivErgebnis>): Promise<ArchivErgebnis> {
  await holeEigenesProfil()
  try {
    const ergebnis = await schritt()
    archivPfadeNeuLaden()
    return ergebnis
  } catch (e) {
    if (e instanceof NutzerFehler) return { fehler: e.message }
    throw e
  }
}

// Rematching erst nach der Antwort; der Datensatz ist dann längst wiederhergestellt,
// ein Fehler hier wird darum nur geloggt.
function rematchNachher(rematch: () => Promise<void>): ArchivErgebnis {
  after(async () => {
    try {
      await rematch()
    } catch (fehler) {
      console.error("Rematching nach dem Wiederherstellen fehlgeschlagen", fehler)
    }
  })
  return { fehler: null, hinweise: [REMATCH_HINWEIS] }
}

export async function objektArchivieren(objektId: string, grund?: string): Promise<ArchivErgebnis> {
  return ausfuehren(async () => {
    const id = pruefeId(objektId)
    await archiviereObjekt(id, pruefeGrund(grund))
    return { fehler: null }
  })
}

export async function anfrageArchivieren(anfrageId: string, grund?: string): Promise<ArchivErgebnis> {
  return ausfuehren(async () => {
    const id = pruefeId(anfrageId)
    await archiviereAnfrage(id, pruefeGrund(grund))
    return { fehler: null }
  })
}

export async function objektWiederherstellen(objektId: string): Promise<ArchivErgebnis> {
  return ausfuehren(async () => {
    const id = pruefeId(objektId)
    const status = await stelleObjektWiederHer(id)
    // Vermietete oder reservierte Objekte bekommen keine neuen Treffer.
    if (status !== "verfuegbar") return { fehler: null }
    return rematchNachher(() => berechneUndSpeichereMatchesFuerObjekt(id))
  })
}

export async function anfrageWiederherstellen(anfrageId: string): Promise<ArchivErgebnis> {
  return ausfuehren(async () => {
    const id = pruefeId(anfrageId)
    const status = await stelleAnfrageWiederHer(id)
    // Vermittelte oder ruhende Anfragen suchen nicht mehr.
    if (status !== "offen") return { fehler: null }
    return rematchNachher(() => berechneUndSpeichereMatchesFuerAnfrage(id))
  })
}
