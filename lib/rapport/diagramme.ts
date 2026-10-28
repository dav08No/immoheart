// Reihen für die 4 Excel-Diagramme der Übersicht. Wiederverwendet die Aggregationen der
// Zahlen-Seite, damit beide Ansichten gleich zählen.
import { TREFFER_STATUS_LABEL } from "@/lib/abschluss/uebergaenge"
import { anfragenProMonat } from "@/lib/zahlen/anfragen"
import { nutzungVerteilung } from "@/lib/zahlen/verteilungen"
import { monatSchluessel } from "@/lib/zahlen/zeitraeume"
import type { RapportAuswahl } from "./auswahl"
import type { RapportDiagramme } from "./typen"
import type { RapportZeitraum } from "./zeitraum"

export const ARCHIVIERT = "Archiviert"

// Mittag UTC liegt in Zürich sicher am selben Kalendertag wie `bis`.
export function stichtag(z: Pick<RapportZeitraum, "bis">): Date {
  return new Date(`${z.bis}T12:00:00Z`)
}

function zaehleJeMonat(zeitpunkte: string[]): Map<string, number> {
  const zaehler = new Map<string, number>()
  for (const t of zeitpunkte) {
    const monat = monatSchluessel(new Date(t))
    zaehler.set(monat, (zaehler.get(monat) ?? 0) + 1)
  }
  return zaehler
}

export function baueDiagramme(a: RapportAuswahl, z: RapportZeitraum): RapportDiagramme {
  // Nur label + Quellen: der Spike-Validator (R1) kennt kein Feld "monat".
  const proMonat = anfragenProMonat(a.neueAnfragen, stichtag(z), z.monate.length).map(({ label, mail, website, manuell }) => ({
    label, mail, website, manuell,
  }))

  const angebote = zaehleJeMonat(a.angebote.flatMap((x) => (x.gesendet_am ? [x.gesendet_am] : [])))
  const vermittlungen = zaehleJeMonat(a.vermittlungen.map((v) => v.abgeschlossenAm))

  // Feste Reihenfolge und auch Nullen, damit das Diagramm Jahr für Jahr gleich aussieht.
  const ergebnisse = new Map<string, number>([...Object.values(TREFFER_STATUS_LABEL), ARCHIVIERT].map((e) => [e, 0]))
  for (const t of a.neueTreffer) {
    const ergebnis = t.quelle === "archiv" ? ARCHIVIERT : TREFFER_STATUS_LABEL[t.status]
    ergebnisse.set(ergebnis, (ergebnisse.get(ergebnis) ?? 0) + 1)
  }

  return {
    anfragenProMonat: proMonat,
    angeboteUndVermittlungenProMonat: z.monate.map((m) => ({
      label: m.label,
      angebote: angebote.get(m.schluessel) ?? 0,
      vermittlungen: vermittlungen.get(m.schluessel) ?? 0,
    })),
    trefferNachErgebnis: [...ergebnisse].map(([ergebnis, anzahl]) => ({ ergebnis, anzahl })),
    nutzungen: nutzungVerteilung(a.neueAnfragen).map(({ label, anzahl }) => ({ label, anzahl })),
  }
}
