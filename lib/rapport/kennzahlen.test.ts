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

  it("Quote = Anteil der neuen Anfragen, die heute vermittelt sind, nie über 100 % (R5)", () => {
    // Zwei alte Anfragen werden im Zeitraum vermittelt, nur eine neue Anfrage ist offen.
    const roh = {
      ...LEERE_ROHDATEN,
      anfragen: [
        { ...BEISPIEL_ROHDATEN.anfragen[3]!, id: "alt1", status: "vermittelt" as const, archiviert_am: null },
        { ...BEISPIEL_ROHDATEN.anfragen[3]!, id: "alt2", status: "vermittelt" as const, archiviert_am: null },
        { ...BEISPIEL_ROHDATEN.anfragen[1]!, id: "neu1", status: "offen" as const },
      ],
      treffer: ["alt1", "alt2"].map((id, i) => ({
        id: `m${i}`, anfrage_id: id, objekt_id: `o${i}`, status: "vermittelt" as const, score: 80,
        created_at: "2025-05-01T09:00:00Z", angeboten_am: "2025-05-02T09:00:00Z", abgeschlossen_am: "2026-05-01T09:00:00Z",
      })),
    }
    const k = rechne(roh).kennzahlen
    expect(k.find((x) => x.schluessel === "vermittlungen")?.wert).toBe(2)
    expect(k.find((x) => x.schluessel === "vermittlungsquote")?.wert).toBe(0)
  })

  it("misst Tage bis Erstangebot an angeboten_am aktiver und archivierter Treffer (wie Zahlen-Seite)", () => {
    const roh = {
      ...LEERE_ROHDATEN,
      anfragen: [{ ...BEISPIEL_ROHDATEN.anfragen[0]!, id: "n1", created_at: "2026-01-01T09:00:00Z" }],
      treffer: [{
        id: "m1", anfrage_id: "n1", objekt_id: "o1", status: "gesendet" as const, score: 80,
        created_at: "2026-01-01T10:00:00Z", angeboten_am: "2026-01-11T09:00:00Z", abgeschlossen_am: null,
      }],
      trefferArchiv: [{
        id: "t1", match_id: "m0", anfrage_id: "n1", objekt_id: "o2", status: "gesendet" as const, score: 70,
        treffer_erstellt_am: "2026-01-01T10:00:00Z", angeboten_am: "2026-01-05T09:00:00Z", abgeschlossen_am: null,
        archiviert_am: "2026-02-01T09:00:00Z", grund: "Anfrage archiviert",
      }],
      // Die Angebots-Mail zählt für die Kachel, nicht für den Median.
      angebote: [{ match_id: null, anfrage_id: "n1", objekt_id: "o9", gesendet_am: "2026-01-02T09:00:00Z" }],
    }
    expect(rechne(roh).medianwerte.tageBisErstangebot).toBe(4)
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
