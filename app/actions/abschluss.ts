"use server"

// Abschluss-Aktionen (Spec §1): zuerst der atomare DB-Übergang, danach die KI-Entwürfe.
// Nichts wird versendet -- es entstehen nur Entwürfe, die Davide selbst prüft und sendet.
import { revalidatePath } from "next/cache"
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

type AbschlussErgebnis = Ergebnis & { hinweise?: string[]; fehlend?: number }
type Folgen = { hinweise?: string[]; fehlend?: number }

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
// { fehler } zurückgeben, alles andere als echten Fehler durchwerfen.
async function ausfuehren(schritt: () => Promise<Folgen>): Promise<AbschlussErgebnis> {
  await holeEigenesProfil()
  try {
    const folgen = await schritt()
    abschlussPfadeNeuLaden()
    return { fehler: null, ...folgen }
  } catch (e) {
    if (e instanceof NutzerFehler) return { fehler: e.message }
    throw e
  }
}

// Der Status ist zu diesem Zeitpunkt schon gespeichert; ein Rechenfehler beim Rematching darf
// die Aktion nicht als gescheitert melden, nur als Hinweis.
async function rematchen(objektId: string): Promise<string[]> {
  try {
    await berechneUndSpeichereMatchesFuerObjekt(objektId)
    return []
  } catch (fehler) {
    console.error("Rematching nach Abschluss-Aktion fehlgeschlagen", objektId, fehler)
    return ["Treffer konnten nicht neu berechnet werden."]
  }
}

export async function trefferReservieren(matchId: string): Promise<AbschlussErgebnis> {
  return ausfuehren(async () => {
    const id = pruefeId(matchId)
    const u = await reserviereTreffer(id)
    return erzeugeAbschlussEntwuerfe({ aktion: "reservieren", objektId: u.objekt_id, hauptMatchId: id, erledigte: [] })
  })
}

export async function trefferVermitteln(matchId: string): Promise<AbschlussErgebnis> {
  return ausfuehren(async () => {
    const id = pruefeId(matchId)
    const u = await vermittleTreffer(id)
    return erzeugeAbschlussEntwuerfe({ aktion: "vermitteln", objektId: u.objekt_id, hauptMatchId: id, erledigte: u.erledigte_treffer })
  })
}

export async function reservierungAufheben(matchId: string): Promise<AbschlussErgebnis> {
  return ausfuehren(async () => {
    const id = pruefeId(matchId)
    const u = await hebeReservierungAuf(id)
    const folgen = await erzeugeAbschlussEntwuerfe({ aktion: "aufheben", objektId: u.objekt_id, hauptMatchId: id, erledigte: [] })
    return { ...folgen, hinweise: [...folgen.hinweise, ...(await rematchen(u.objekt_id))] }
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
    return erzeugeAbschlussEntwuerfe({ aktion: "nicht_verfuegbar", objektId: u.objekt_id, hauptMatchId: null, erledigte: u.erledigte_treffer })
  })
}

export async function objektWiederVerfuegbar(objektId: string): Promise<AbschlussErgebnis> {
  return ausfuehren(async () => {
    const id = pruefeId(objektId)
    await setzeObjektWiederVerfuegbar(id)
    return { hinweise: await rematchen(id) }
  })
}

export async function abschlussEntwuerfeNachholen(objektId: string): Promise<AbschlussErgebnis> {
  return ausfuehren(async () => holeAbschlussEntwuerfeNach(pruefeId(objektId)))
}
