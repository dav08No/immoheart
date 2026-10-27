import { describe, expect, it } from "vitest"
import { waehleAus } from "./auswahl"
import { BEISPIEL_JETZT, BEISPIEL_ROHDATEN } from "./beispiel-daten"
import { baueDiagramme } from "./diagramme"
import { LEERE_ROHDATEN } from "./roh"
import { rapportZeitraum } from "./zeitraum"

const z = rapportZeitraum(BEISPIEL_JETZT)
const diagramme = (roh = BEISPIEL_ROHDATEN) => baueDiagramme(waehleAus(roh, z), z)

describe("baueDiagramme", () => {
  it("liefert bei leeren Daten 13 Nullmonate und Nullen je Ergebnis", () => {
    const d = diagramme(LEERE_ROHDATEN)
    expect(d.anfragenProMonat).toHaveLength(13)
    expect(d.anfragenProMonat[0]).toEqual({ label: "Okt 25", mail: 0, website: 0, manuell: 0 })
    expect(d.angeboteUndVermittlungenProMonat).toHaveLength(13)
    expect(d.angeboteUndVermittlungenProMonat.every((m) => m.angebote === 0 && m.vermittlungen === 0)).toBe(true)
    expect(d.trefferNachErgebnis.every((e) => e.anzahl === 0)).toBe(true)
    expect(d.nutzungen).toEqual([])
  })

  it("behält die Spike-Form von anfragenProMonat (nur label + Quellen)", () => {
    const d = diagramme()
    expect(Object.keys(d.anfragenProMonat[0] ?? {})).toEqual(["label", "mail", "website", "manuell"])
    const nov = d.anfragenProMonat.find((m) => m.label === "Nov 25")
    expect(nov).toEqual({ label: "Nov 25", mail: 1, website: 0, manuell: 0 })
  })

  it("zählt Angebote und Vermittlungen je Monat", () => {
    const d = diagramme()
    expect(d.angeboteUndVermittlungenProMonat.find((m) => m.label === "Nov 25")).toEqual({ label: "Nov 25", angebote: 2, vermittlungen: 0 })
    expect(d.angeboteUndVermittlungenProMonat.find((m) => m.label === "Jan 26")).toEqual({ label: "Jan 26", angebote: 0, vermittlungen: 1 })
    expect(d.angeboteUndVermittlungenProMonat.find((m) => m.label === "Mär 26")?.angebote).toBe(1)
  })

  it("zählt Treffer nach aktuellem Status, archivierte als 'Archiviert'", () => {
    const d = diagramme()
    // Neu erstellt: m1 vermittelt, m2 angeboten, m3 neu, m9 archiviert. m8 entstand vor dem Zeitraum.
    expect(d.trefferNachErgebnis).toEqual([
      { ergebnis: "Neu", anzahl: 1 },
      { ergebnis: "Angeboten", anzahl: 1 },
      { ergebnis: "Verworfen", anzahl: 0 },
      { ergebnis: "Reserviert", anzahl: 0 },
      { ergebnis: "Vermittelt", anzahl: 1 },
      { ergebnis: "Abgelehnt", anzahl: 0 },
      { ergebnis: "Erledigt", anzahl: 0 },
      { ergebnis: "Archiviert", anzahl: 1 },
    ])
  })

  it("zählt gesuchte Nutzungen der neuen Anfragen", () => {
    expect(diagramme().nutzungen).toEqual([
      { label: "Büro", anzahl: 2 },
      { label: "Lager", anzahl: 1 },
    ])
  })
})
