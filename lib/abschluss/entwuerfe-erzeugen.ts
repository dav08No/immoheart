// Ablauf nach einem Abschluss-Übergang (Spec §2 KI-Ausfall, Ruling R7): erst je geplanter Mail
// einen Platzhalter-Entwurf anlegen, dann jeden einzeln per KI füllen. Fällt die KI aus, bleibt
// der Platzhalter stehen (leerer Text ist nicht sendbar) und kann später nachgeholt werden.
import "server-only"
import { entwurfAbsage, entwurfBestaetigung, entwurfEigentuemerInfo } from "@/lib/ki/abschluss-entwuerfe"
import type { Mailentwurf } from "@/lib/ki/entwuerfe"
import { anfrageKurz } from "@/lib/eingang/zuordnung"
import { betreffFuerAnfrage } from "@/lib/abschluss/betreff"
import {
  abschlussMarker,
  markerFelder,
  planeEntwuerfe,
  zuFuellendePlatzhalter,
  type AbschlussAktion,
  type GeplanterEntwurf,
} from "@/lib/abschluss/entwuerfe-plan"
import {
  fuellePlatzhalter,
  holeAbschlussKontext,
  holePlatzhalterKandidaten,
  legePlatzhalterAn,
  type AbschlussKontext,
} from "@/lib/queries/abschluss-entwuerfe"
import type { NachrichtRow } from "@/lib/queries/nachrichten"

export type EntwurfsErgebnis = { hinweise: string[]; fehlend: number }

export const PLATZHALTER_BETREFF = "Entwurf wird erstellt…"

function platzhalterZeile(g: GeplanterEntwurf, kontext: AbschlussKontext) {
  // Eigentümer-Mails nie in den Verlauf der Firma hängen: entwurfSenden fädelt über anfrage_id.
  const anfrage_id = g.typ === "eigentuemer_info" || !g.match_id ? null : (kontext.treffer.get(g.match_id)?.anfrage_id ?? null)
  return {
    richtung: "entwurf" as const,
    typ: g.typ,
    an: g.an,
    von: process.env.GMAIL_USER ?? "",
    betreff: PLATZHALTER_BETREFF,
    body: "",
    erkannte_felder: markerFelder({ ki_ausstehend: true, anlass: g.anlass }),
    objekt_id: g.objekt_id,
    match_id: g.match_id,
    anfrage_id,
  }
}

async function kiEntwurf(z: NachrichtRow, kontext: AbschlussKontext): Promise<Mailentwurf> {
  const objektTitel = kontext.objekt.titel
  const treffer = z.match_id ? kontext.treffer.get(z.match_id) : undefined
  if (z.typ === "absage") return entwurfAbsage({ objektTitel, anfrageKurz: anfrageKurz(treffer?.anfrage ?? null) })
  if (z.typ === "bestaetigung") return entwurfBestaetigung({ objektTitel, firma: treffer?.firma ?? null })
  const anlass = abschlussMarker(z.erkannte_felder)?.anlass
  if (z.typ !== "eigentuemer_info" || !anlass) throw new Error(`Unbekannter Abschluss-Entwurf ${z.id}`)
  return entwurfEigentuemerInfo({ objektTitel, anlass })
}

async function fuelleEinen(z: NachrichtRow, kontext: AbschlussKontext): Promise<void> {
  const entwurf = await kiEntwurf(z, kontext)
  // Leerer Text würde den Platzhalter als "fertig" markieren, ohne dass er je sendbar wäre.
  if (!entwurf.body.trim() || !entwurf.betreff.trim()) throw new Error("KI lieferte leeren Entwurf")
  const betreff = z.anfrage_id ? await betreffFuerAnfrage(z.anfrage_id, entwurf.betreff) : entwurf.betreff
  const anlass = abschlussMarker(z.erkannte_felder)?.anlass
  await fuellePlatzhalter(z.id, { betreff, body: entwurf.body, erkannte_felder: markerFelder({ ki_ausstehend: false, anlass }) })
}

// Nacheinander statt parallel: schont das Gemini-Tageslimit und die Rate-Grenze.
async function fuelleAlle(platzhalter: NachrichtRow[], kontext: AbschlussKontext): Promise<number> {
  let fehlend = 0
  for (const z of platzhalter) {
    try {
      await fuelleEinen(z, kontext)
    } catch (fehler) {
      console.error("Abschluss-Entwurf konnte nicht erzeugt werden", z.id, fehler)
      fehlend++
    }
  }
  return fehlend
}

export async function erzeugeAbschlussEntwuerfe(p: {
  aktion: AbschlussAktion
  objektId: string
  hauptMatchId: string | null
  erledigte: string[]
}): Promise<EntwurfsErgebnis> {
  const ids = p.hauptMatchId ? [p.hauptMatchId, ...p.erledigte] : p.erledigte
  const kontext = await holeAbschlussKontext(p.objektId, ids)
  const empfaenger = (id: string) => {
    const t = kontext.treffer.get(id)
    return { id, firmaEmail: t?.firmaEmail ?? null, firma: t?.firma ?? null }
  }
  // Empfänger werden hier geprüft: ohne Adresse entsteht weder Zeile noch KI-Aufruf.
  const { geplant, hinweise } = planeEntwuerfe({
    aktion: p.aktion,
    objekt: kontext.objekt,
    treffer: p.hauptMatchId ? empfaenger(p.hauptMatchId) : null,
    erledigte: p.erledigte.map(empfaenger),
  })
  if (geplant.length === 0) return { hinweise, fehlend: 0 }

  let platzhalter: NachrichtRow[]
  try {
    platzhalter = await legePlatzhalterAn(geplant.map((g) => platzhalterZeile(g, kontext)))
  } catch (fehler) {
    // Der Status ist bereits gespeichert; ein Fehler hier darf ihn nicht als gescheitert melden.
    console.error("Abschluss-Platzhalter konnten nicht angelegt werden", fehler)
    return { hinweise: [...hinweise, "Status gespeichert, aber die Entwürfe konnten nicht angelegt werden."], fehlend: 0 }
  }
  return { hinweise, fehlend: await fuelleAlle(platzhalter, kontext) }
}

// Idempotent: füllt nur vorhandene, noch leere Platzhalter des Objekts, legt nie neue an.
export async function holeAbschlussEntwuerfeNach(objektId: string): Promise<EntwurfsErgebnis> {
  const offen = zuFuellendePlatzhalter(await holePlatzhalterKandidaten(objektId))
  if (offen.length === 0) return { hinweise: [], fehlend: 0 }
  const matchIds = [...new Set(offen.flatMap((z) => (z.match_id ? [z.match_id] : [])))]
  const kontext = await holeAbschlussKontext(objektId, matchIds)
  return { hinweise: [], fehlend: await fuelleAlle(offen, kontext) }
}
