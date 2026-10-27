import { describe, expect, it } from "vitest"
import { waehleAus } from "./auswahl"
import { BEISPIEL_JETZT, BEISPIEL_ROHDATEN } from "./beispiel-daten"
import { berechneKennzahlen, kennzahlenFuerKi } from "./kennzahlen"
import { baueRapportModell } from "./modell"
import { LEERE_ROHDATEN } from "./roh"
import { rapportZeitraum } from "./zeitraum"

const z = rapportZeitraum(BEISPIEL_JETZT)
const rechne = (roh = BEISPIEL_ROHDATEN) => berechneKennzahlen(waehleAus(roh, z), roh)

describe("berechneKennzahlen", () => {
  it("liefert 6 Kacheln in fester Reihenfolge", () => {
    expect(rechne().kennzahlen.map((k) => [k.schluessel, k.wert])).toEqual([
      ["neueAnfragen", 3],
      ["neueObjekte", 2],
      ["treffer", 4],
      ["angebote", 3],
      ["vermittlungen", 1],
      ["vermittlungsquote", 1 / 3],
    ])
  })

  it("beschreibt die Werte mit einem kurzen Zusatz ohne Namen", () => {
    const texte = Object.fromEntries(rechne().kennzahlen.map((k) => [k.schluessel, k.text]))
    expect(texte.neueAnfragen).toBe("davon 1 per Mail, 1 über Website, 1 manuell")
    expect(texte.treffer).toBe("davon 1 archiviert")
    expect(texte.angebote).toBe("für 3 Anfragen")
    expect(texte.vermittlungen).toBe("Median 78 Tage bis Abschluss")
  })

  it("rechnet Medianwerte auf eine Nachkommastelle", () => {
    // a1: 03.11. -> Angebot 05.11. = 2 Tage, a2: 15.03. -> 18.03. = 3 Tage -> Median 2.5
    expect(rechne().medianwerte).toEqual({ tageBisErstangebot: 2.5, tageBisAbschluss: 78 })
  })

  it("setzt die Quote bei 0 neuen Anfragen auf null statt durch 0 zu teilen", () => {
    const k = rechne(LEERE_ROHDATEN)
    expect(k.kennzahlen.every((x) => x.wert === (x.schluessel === "vermittlungsquote" ? null : 0))).toBe(true)
    expect(k.medianwerte).toEqual({ tageBisErstangebot: null, tageBisAbschluss: null })
    expect(k.kennzahlen.find((x) => x.schluessel === "vermittlungen")?.text).toBe("noch keine Vermittlung")
  })
})

describe("kennzahlenFuerKi", () => {
  it("enthält nur Zahlen und feste Beschriftungen, keine Namen", () => {
    const ki = kennzahlenFuerKi(baueRapportModell(BEISPIEL_ROHDATEN, z))
    const json = JSON.stringify(ki)
    for (const name of [...BEISPIEL_ROHDATEN.firmen.map((f) => f.name), ...BEISPIEL_ROHDATEN.objekte.map((o) => o.titel), "Solothurn", "Grenchen"]) {
      expect(json).not.toContain(name)
    }
    expect(ki.kennzahlen.neueAnfragen).toBe(3)
    expect(ki.zeitraum).toBe("27.10.2025 – 27.10.2026")
    expect(ki.anfragenProMonat).toHaveLength(13)
  })
})
