// Die 6 Kennzahl-Kacheln, die Medianwerte und der namensfreie Auszug für die KI.
import { erstesAngebotJeAnfrage, formatTage } from "@/lib/zahlen/anzeige"
import { abschluesseJeAnfrage, tageBisAbschluss, tageBisErstangebot } from "@/lib/zahlen/anfragen"
import type { RapportAuswahl } from "./auswahl"
import type { RapportRohdaten } from "./roh"
import type { Kachel, KennzahlenFuerKi, Medianwerte, RapportModell } from "./typen"

function eineStelle(wert: number | null): number | null {
  return wert === null ? null : Math.round(wert * 10) / 10
}

function zaehle<T>(liste: T[], passt: (x: T) => boolean): number {
  return liste.filter(passt).length
}

export function berechneKennzahlen(a: RapportAuswahl, roh: RapportRohdaten): { kennzahlen: Kachel[]; medianwerte: Medianwerte } {
  // Erstangebot nur für neue Anfragen: deren Angebote liegen alle im Zeitraum, das
  // früheste ist also wirklich das erste.
  const neuErstellt = Object.fromEntries(a.neueAnfragen.map((x) => [x.id, x.created_at]))
  const erstangebot = tageBisErstangebot(erstesAngebotJeAnfrage(a.angebote, neuErstellt))
  // Abschluss über alle Anfragen: vermittelt wird oft eine ältere Anfrage.
  const alleErstellt = Object.fromEntries(roh.anfragen.map((x) => [x.id, x.created_at]))
  const abschluss = tageBisAbschluss(
    abschluesseJeAnfrage(a.vermittlungen.map((v) => ({ anfrage_id: v.anfrageId, status: "vermittelt", abgeschlossen_am: v.abgeschlossenAm })), alleErstellt)
  )
  const medianwerte = { tageBisErstangebot: eineStelle(erstangebot.median), tageBisAbschluss: eineStelle(abschluss.median) }

  const anfragen = a.neueAnfragen
  const quelle = (q: string) => zaehle(anfragen, (x) => x.quelle === q)
  const angefragt = new Set(a.angebote.flatMap((x) => (x.anfrage_id ? [x.anfrage_id] : []))).size
  // Definition laut Controller: Vermittlungen im Zeitraum je neue Anfrage im Zeitraum.
  const quote = anfragen.length > 0 ? a.vermittlungen.length / anfragen.length : null

  const kennzahlen: Kachel[] = [
    {
      schluessel: "neueAnfragen", titel: "Neue Anfragen", format: "zahl", wert: anfragen.length,
      text: `davon ${quelle("mail")} per Mail, ${quelle("website")} über Website, ${quelle("manuell")} manuell`,
    },
    {
      schluessel: "neueObjekte", titel: "Neue Objekte", format: "zahl", wert: a.neueObjekte.length,
      text: `davon ${zaehle(a.neueObjekte, (o) => o.status === "vermietet")} vermietet`,
    },
    {
      schluessel: "treffer", titel: "Treffer", format: "zahl", wert: a.neueTreffer.length,
      text: `davon ${zaehle(a.neueTreffer, (t) => t.quelle === "archiv")} archiviert`,
    },
    { schluessel: "angebote", titel: "Gesendete Angebote", format: "zahl", wert: a.angebote.length, text: `für ${angefragt} Anfragen` },
    {
      schluessel: "vermittlungen", titel: "Vermittlungen", format: "zahl", wert: a.vermittlungen.length,
      text: medianwerte.tageBisAbschluss === null ? "noch keine Vermittlung" : `Median ${formatTage(medianwerte.tageBisAbschluss)} Tage bis Abschluss`,
    },
    {
      schluessel: "vermittlungsquote", titel: "Vermittlungsquote", format: "prozent", wert: quote,
      text: quote === null ? "keine neuen Anfragen" : "Vermittlungen je neue Anfrage",
    },
  ]
  return { kennzahlen, medianwerte }
}

// Baut den KI-Auszug feldweise neu auf, statt das Modell zu kopieren: so kann kein
// Tabellenfeld (Firma, Objekt) versehentlich mitreisen.
export function kennzahlenFuerKi(m: RapportModell): KennzahlenFuerKi {
  const wert = (s: Kachel["schluessel"]) => m.kennzahlen.find((k) => k.schluessel === s)?.wert ?? null
  const d = m.diagramme
  return {
    zeitraum: m.zeitraum.label,
    kennzahlen: {
      neueAnfragen: wert("neueAnfragen"),
      neueObjekte: wert("neueObjekte"),
      treffer: wert("treffer"),
      angebote: wert("angebote"),
      vermittlungen: wert("vermittlungen"),
      vermittlungsquote: wert("vermittlungsquote"),
    },
    medianwerte: { ...m.medianwerte },
    anfragenProMonat: d.anfragenProMonat.map(({ label, mail, website, manuell }) => ({ label, mail, website, manuell })),
    angeboteUndVermittlungenProMonat: d.angeboteUndVermittlungenProMonat.map(({ label, angebote, vermittlungen }) => ({ label, angebote, vermittlungen })),
    trefferNachErgebnis: d.trefferNachErgebnis.map(({ ergebnis, anzahl }) => ({ ergebnis, anzahl })),
    nutzungen: d.nutzungen.map(({ label, anzahl }) => ({ label, anzahl })),
  }
}
