// JSON-Modell für die Python-Funktion api/rapport_excel.py. Rein: Rohdaten + Zeitraum rein,
// Modell raus. Der Vertrag (Typen) steht in ./typen, das Beispiel in api/tests/fixtures/modell.json.
import { nachschlagen, waehleAus } from "./auswahl"
import { baueDiagramme } from "./diagramme"
import { berechneKennzahlen } from "./kennzahlen"
import type { RapportRohdaten } from "./roh"
import { baueTabellen } from "./tabellen"
import type { RapportModell } from "./typen"
import type { RapportZeitraum } from "./zeitraum"

export type * from "./typen"

// Für das Blatt "Hinweise": jede Kennzahl soll nachvollziehbar sein.
function hinweise(z: RapportZeitraum): string[] {
  return [
    "Datenquelle: immoheart-Datenbank, einschliesslich archivierter Treffer, Objekte und Anfragen.",
    `Zeitraum: ${z.label}, Schweizer Zeit, beide Tage eingeschlossen. Ein Ereignis zählt, wenn sein eigenes Datum im Zeitraum liegt.`,
    "Neue Anfragen: Anfragen mit Eingangsdatum im Zeitraum.",
    "Neue Objekte: Objekte, die im Zeitraum erfasst wurden.",
    "Treffer: im Zeitraum entstandene Treffer, aktive und archivierte, je Paar aus Anfrage und Objekt einmal (ein entfernter und neu gefundener Treffer zählt nicht doppelt).",
    "Gesendete Angebote: im Zeitraum gesendete Angebots-Mails, auch solche, die später aus dem Postfach gelöscht wurden; ohne Mails zu endgültig gelöschten Anfragen.",
    "Vermittlungen: Treffer mit Abschlussdatum (vermittelt) im Zeitraum.",
    "Vermittlungsquote: Anteil der neuen Anfragen im Zeitraum, die heute den Status «vermittelt» haben (höchstens 100 %).",
    "Tage bis Erstangebot: Median vom Eingang einer neuen Anfrage bis zum ersten Angebot (Versanddatum des Treffers, aktiv oder archiviert), wie auf der Seite «Zahlen».",
    "Tage bis Abschluss: Median vom Eingang der Anfrage bis zur Vermittlung.",
    "Treffer nach Ergebnis: aktueller Status der Treffer; archivierte Treffer erscheinen als «Archiviert».",
    "Blätter Anfragen und Objekte: im Zeitraum erfasst oder archiviert. Blatt Treffer: je Paar aus Anfrage und Objekt eine Zeile, die im Zeitraum entstand oder archiviert wurde; der aktive Treffer hat Vorrang, sonst der jüngste Archiveintrag.",
    "Endgültig gelöschte Einträge sind nicht enthalten.",
  ]
}

export function baueRapportModell(roh: RapportRohdaten, z: RapportZeitraum): RapportModell {
  const auswahl = waehleAus(roh, z)
  const { kennzahlen, medianwerte } = berechneKennzahlen(auswahl, roh)
  return {
    zeitraum: { label: z.label, von: z.von, bis: z.bis },
    kennzahlen,
    medianwerte,
    diagramme: baueDiagramme(auswahl, z),
    tabellen: baueTabellen(auswahl, roh, nachschlagen(roh)),
    hinweise: hinweise(z),
  }
}
