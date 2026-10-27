import { kiFehlerText } from "@/lib/eingang/ki-fehler"
import type { KennzahlenFuerKi, RapportTexte } from "@/lib/rapport/typen"
import { generiereText } from "./gemini"
import { entferneCodeZaeune } from "./erkennung"

export type RapportTextErgebnis = { text: RapportTexte } | { fehler: string }

const MAX_ABSCHNITT = 1200
const ABSCHNITTE = ["rueckblick", "trends", "auffaelligkeiten", "ausblick"] as const

// Bewusst feldweise kopiert: selbst wenn zur Laufzeit mehr im Objekt steckt
// (z. B. Namen), gelangt nur die bekannte Zahlenauswahl in den Prompt.
function nurZahlen(e: KennzahlenFuerKi): KennzahlenFuerKi {
  return {
    zeitraum: e.zeitraum,
    kennzahlen: {
      neueAnfragen: e.kennzahlen.neueAnfragen, neueObjekte: e.kennzahlen.neueObjekte, treffer: e.kennzahlen.treffer,
      angebote: e.kennzahlen.angebote, vermittlungen: e.kennzahlen.vermittlungen, vermittlungsquote: e.kennzahlen.vermittlungsquote,
    },
    medianwerte: { tageBisErstangebot: e.medianwerte.tageBisErstangebot, tageBisAbschluss: e.medianwerte.tageBisAbschluss },
    anfragenProMonat: e.anfragenProMonat.map((m) => ({ label: m.label, mail: m.mail, website: m.website, manuell: m.manuell })),
    angeboteUndVermittlungenProMonat: e.angeboteUndVermittlungenProMonat.map((m) => ({
      label: m.label, angebote: m.angebote, vermittlungen: m.vermittlungen,
    })),
    trefferNachErgebnis: e.trefferNachErgebnis.map((t) => ({ ergebnis: t.ergebnis, anzahl: t.anzahl })),
    nutzungen: e.nutzungen.map((n) => ({ label: n.label, anzahl: n.anzahl })),
  }
}

export function baueRapportPrompt(eingabe: KennzahlenFuerKi): string {
  const daten = nurZahlen(eingabe)
  return `immoheart verwaltet Gewerbeflächen-Anfragen und -Objekte. Verfasse einen sachlichen Jahresrückblick für den Zeitraum «${daten.zeitraum}».

Regeln:
- Standarddeutsch in Schweizer Schreibweise (ss statt ß), per Sie oder neutral, ohne Floskeln.
- Verwende ausschliesslich die unten gelieferten Zahlen und erfinde nichts (keine Namen, Ursachen oder Prognosen mit Zahlen).
- Nenne den Zeitraum «${daten.zeitraum}» im Text.
- Vier Abschnitte, je 2 bis 4 Sätze: rueckblick, trends, auffaelligkeiten, ausblick.
- Die Vermittlungsquote ist ein Anteil von 0 bis 1 (0.07 = 7 %). Ein Median von null bedeutet: nicht berechenbar.

Zahlen (JSON):
${JSON.stringify(daten, null, 2)}

Antworte ausschliesslich mit einem JSON-Objekt, ohne weitere Erklärung: {"rueckblick": string, "trends": string, "auffaelligkeiten": string, "ausblick": string}.`
}

// Wirft bei ungültigem JSON oder fehlendem/leerem Abschnitt; entwurfRapportText fängt das ab.
export function parseRapportAntwort(antwort: string): RapportTexte {
  const roh: unknown = JSON.parse(entferneCodeZaeune(antwort))
  // null, Zahl oder Liste sind gültiges JSON, aber keine Antwort: wie ungültiges JSON behandeln.
  if (typeof roh !== "object" || roh === null || Array.isArray(roh)) throw new SyntaxError("Kein JSON-Objekt")
  const daten = roh as Record<string, unknown>
  const text = {} as RapportTexte
  for (const schluessel of ABSCHNITTE) {
    const wert = daten[schluessel]
    if (typeof wert !== "string" || wert.trim() === "") throw new SyntaxError(`Abschnitt ${schluessel} fehlt`)
    text[schluessel] = wert.trim().slice(0, MAX_ABSCHNITT)
  }
  return text
}

// Nie werfen: ein KI-Fehler darf den Rapport nicht abbrechen. Genau ein Aufruf.
export async function entwurfRapportText(eingabe: KennzahlenFuerKi): Promise<RapportTextErgebnis> {
  try {
    return { text: parseRapportAntwort(await generiereText(baueRapportPrompt(eingabe))) }
  } catch (e) {
    return { fehler: kiFehlerText(e) }
  }
}
