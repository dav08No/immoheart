"use server"

// Abschluss-Aktionen (Spec §1): zuerst der atomare DB-Übergang, danach die KI-Entwürfe.
// Nichts wird versendet -- es entstehen nur Entwürfe, die Davide selbst prüft und sendet.
// Ruling R15: Übergang + Platzhalter laufen vor der Antwort, KI-Füllung und Rematching erst
// danach in after() -- sonst dauerten die Aktionen bis zu 60 s (Vercel-Timeout).
import { revalidatePath } from "next/cache"
import { after } from "next/server"
import { holeEigenesProfil } from "@/lib/queries/profile"
import { NutzerFehler } from "@/lib/nutzer-fehler"
import {
  hebeReservierungAuf,
  lehneTrefferAb,
  meldeObjektNichtVerfuegbar,
  reserviereTreffer,
  setzeObjektWiederVerfuegbar,
  vermittleTreffer,
} from "@/lib/queries/abschluss"
import { berechneUndSpeichereMatchesFuerObjekt } from "@/lib/queries/matches"
import { verknuepfeObjektMitEingang } from "@/lib/queries/nachrichten"
import { erzeugeAbschlussEntwuerfe, holeAbschlussEntwuerfeNach } from "@/lib/abschluss/entwuerfe-erzeugen"
import { idSchema, type Ergebnis } from "@/app/actions/entwuerfe-hilfen"

// hintergrund: fehlend zählt Platzhalter, deren KI-Text gerade nach der Antwort entsteht.
type AbschlussErgebnis = Ergebnis & { hinweise?: string[]; fehlend?: number; hintergrund?: boolean }
type Folgen = { hinweise?: string[]; fehlend?: number; hintergrund?: boolean; nachher?: (() => Promise<void>)[] }

function pruefeId(id: unknown): string {
  const geprueft = idSchema.safeParse(id)
  if (!geprueft.success) throw new NutzerFehler("Ungültige ID.")
  return geprueft.data
}

function abschlussPfadeNeuLaden() {
  for (const pfad of ["/admin", "/admin/anfragen", "/admin/objekte", "/admin/entwuerfe", "/admin/postfach", "/objekte"]) {
    revalidatePath(pfad)
  }
  revalidatePath("/admin", "layout")
}

// Gemeinsamer Rahmen: NutzerFehler (P0001 aus den Übergangsfunktionen, ungültige ID) als
// { fehler } zurückgeben, alles andere als echten Fehler durchwerfen. Die nachher-Schritte
// laufen nach der Antwort; ihre Fehler werden nur geloggt (der Status ist längst gespeichert).
async function ausfuehren(schritt: () => Promise<Folgen>): Promise<AbschlussErgebnis> {
  await holeEigenesProfil()
  try {
    const { nachher = [], ...folgen } = await schritt()
    for (const aufgabe of nachher) {
      after(async () => {
        try {
          await aufgabe()
        } catch (fehler) {
          console.error("Abschluss-Hintergrundschritt fehlgeschlagen", fehler)
        }
      })
    }
    abschlussPfadeNeuLaden()
    return { fehler: null, ...folgen }
  } catch (e) {
    if (e instanceof NutzerFehler) return { fehler: e.message }
    throw e
  }
}

const REMATCH_HINWEIS = "Treffer werden im Hintergrund neu berechnet."

function rematchen(objektId: string): () => Promise<void> {
  return () => berechneUndSpeichereMatchesFuerObjekt(objektId)
}

// Status ist nach dem RPC bereits gespeichert: ein Fehler beim Laden des Kontexts oder Anlegen
// der Platzhalter darf die Aktion nicht als gescheitert melden (sonst klickt man erneut).
async function entwuerfeSicher(p: Parameters<typeof erzeugeAbschlussEntwuerfe>[0]): Promise<Folgen & { hinweise: string[] }> {
  try {
    const { hinweise, angelegt, fuellen } = await erzeugeAbschlussEntwuerfe(p)
    if (angelegt === 0) return { hinweise }
    const fuellenUndMelden = async () => {
      const fehlend = await fuellen()
      if (fehlend > 0) console.error("Abschluss-Entwürfe ohne KI-Text", p.objektId, fehlend)
    }
    return { hinweise, fehlend: angelegt, hintergrund: true, nachher: [fuellenUndMelden] }
  } catch (fehler) {
    console.error("Abschluss-Entwürfe konnten nicht angelegt werden", p.objektId, fehler)
    return { hinweise: ["Status gespeichert, aber die Entwürfe konnten nicht angelegt werden."] }
  }
}

export async function trefferReservieren(matchId: string): Promise<AbschlussErgebnis> {
  return ausfuehren(async () => {
    const id = pruefeId(matchId)
    const u = await reserviereTreffer(id)
    return entwuerfeSicher({ aktion: "reservieren", objektId: u.objekt_id, hauptMatchId: id, erledigte: [] })
  })
}

export async function trefferVermitteln(matchId: string): Promise<AbschlussErgebnis> {
  return ausfuehren(async () => {
    const id = pruefeId(matchId)
    const u = await vermittleTreffer(id)
    return entwuerfeSicher({ aktion: "vermitteln", objektId: u.objekt_id, hauptMatchId: id, erledigte: u.erledigte_treffer })
  })
}

export async function reservierungAufheben(matchId: string): Promise<AbschlussErgebnis> {
  return ausfuehren(async () => {
    const id = pruefeId(matchId)
    const u = await hebeReservierungAuf(id)
    const folgen = await entwuerfeSicher({ aktion: "aufheben", objektId: u.objekt_id, hauptMatchId: id, erledigte: [] })
    // Rematching zuerst: reine DB-Arbeit, die neuen Treffer sollen nicht auf die KI warten.
    return {
      ...folgen,
      hinweise: [...folgen.hinweise, REMATCH_HINWEIS],
      nachher: [rematchen(u.objekt_id), ...(folgen.nachher ?? [])],
    }
  })
}

export async function trefferAblehnen(matchId: string): Promise<AbschlussErgebnis> {
  return ausfuehren(async () => {
    await lehneTrefferAb(pruefeId(matchId))
    return {}
  })
}

export async function objektNichtVerfuegbar(objektId: string, eingangId?: string): Promise<AbschlussErgebnis> {
  return ausfuehren(async () => {
    const id = pruefeId(objektId)
    const eingang = eingangId === undefined ? null : pruefeId(eingangId)
    const u = await meldeObjektNichtVerfuegbar(id)
    if (eingang) {
      // Best-effort: die Meldung soll im Postfach beim Objekt hängen; der Status zählt mehr.
      try {
        await verknuepfeObjektMitEingang(eingang, id)
      } catch (fehler) {
        console.error("Objektmeldung konnte nicht mit dem Objekt verknüpft werden", eingang, fehler)
      }
    }
    return entwuerfeSicher({ aktion: "nicht_verfuegbar", objektId: u.objekt_id, hauptMatchId: null, erledigte: u.erledigte_treffer })
  })
}

export async function objektWiederVerfuegbar(objektId: string): Promise<AbschlussErgebnis> {
  return ausfuehren(async () => {
    const id = pruefeId(objektId)
    await setzeObjektWiederVerfuegbar(id)
    return { hinweise: [REMATCH_HINWEIS], nachher: [rematchen(id)] }
  })
}

export async function abschlussEntwuerfeNachholen(objektId: string): Promise<AbschlussErgebnis> {
  return ausfuehren(async () => holeAbschlussEntwuerfeNach(pruefeId(objektId)))
}
