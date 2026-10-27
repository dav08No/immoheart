import { describe, expect, it } from "vitest"
import { filtereArchiv, imZeitraum, jahreMitDaten, jahrVon, mitgeloeschtText, passtSuche, SUCHTEXTE } from "./filter"

const JETZT = new Date("2026-10-27T10:00:00Z")

describe("imZeitraum", () => {
  it("12 Monate: bis genau ein Jahr zurück", () => {
    expect(imZeitraum("2025-10-27T10:00:00Z", "12m", JETZT)).toBe(true)
    expect(imZeitraum("2025-10-27T09:59:59Z", "12m", JETZT)).toBe(false)
    expect(imZeitraum("2026-10-01T00:00:00Z", "12m", JETZT)).toBe(true)
  })
  it("Kalenderjahr in Schweizer Zeit", () => {
    // 31.12.2025 23:30 UTC ist in Zürich bereits der 1.1.2026.
    expect(jahrVon("2025-12-31T23:30:00Z")).toBe(2026)
    expect(imZeitraum("2025-12-31T23:30:00Z", 2026, JETZT)).toBe(true)
    expect(imZeitraum("2025-06-01T00:00:00Z", 2026, JETZT)).toBe(false)
  })
  it("alles", () => {
    expect(imZeitraum("2019-01-01T00:00:00Z", "alles", JETZT)).toBe(true)
  })
})

describe("jahreMitDaten", () => {
  it("eindeutig und absteigend", () => {
    expect(jahreMitDaten(["2024-03-01T00:00:00Z", "2026-01-01T12:00:00Z", "2024-08-01T00:00:00Z"])).toEqual([2026, 2024])
    expect(jahreMitDaten([])).toEqual([])
  })
})

describe("passtSuche", () => {
  it("ohne Gross-/Kleinschreibung, leere Suche passt immer", () => {
    expect(passtSuche(["Müller AG", null], "müller")).toBe(true)
    expect(passtSuche(["Müller AG"], "  ")).toBe(true)
    expect(passtSuche([null, "Halle Nord"], "süd")).toBe(false)
  })
})

describe("filtereArchiv", () => {
  const treffer = [
    { firma: "Muster AG", objekt: "Halle Nord", grund: "Objekt vermietet", archiviert_am: "2026-05-01T00:00:00Z" },
    { firma: null, objekt: null, grund: "passt nicht mehr", archiviert_am: "2024-05-01T00:00:00Z" },
    { firma: "Beispiel GmbH", objekt: "Büro Süd", grund: "Anfrage vermittelt", archiviert_am: "2026-02-01T00:00:00Z" },
  ]
  it("kombiniert Zeitraum und Suche über Firma, Objekt und Grund", () => {
    expect(filtereArchiv(treffer, "12m", "", SUCHTEXTE.treffer, JETZT)).toHaveLength(2)
    expect(filtereArchiv(treffer, "12m", "halle", SUCHTEXTE.treffer, JETZT).map((t) => t.firma)).toEqual(["Muster AG"])
    expect(filtereArchiv(treffer, "alles", "PASST", SUCHTEXTE.treffer, JETZT)).toHaveLength(1)
    expect(filtereArchiv(treffer, 2024, "", SUCHTEXTE.treffer, JETZT)).toHaveLength(1)
    expect(filtereArchiv(treffer, "12m", "vermittelt", SUCHTEXTE.treffer, JETZT).map((t) => t.objekt)).toEqual(["Büro Süd"])
  })
})

describe("mitgeloeschtText", () => {
  it("Singular, Plural und Weglassen von Nullen", () => {
    expect(mitgeloeschtText(3, 4)).toBe("Mitgelöscht werden: 3 archivierte Treffer und 4 Fotos")
    expect(mitgeloeschtText(1, 1)).toBe("Mitgelöscht werden: 1 archivierter Treffer und 1 Foto")
    expect(mitgeloeschtText(2, null)).toBe("Mitgelöscht werden: 2 archivierte Treffer")
    expect(mitgeloeschtText(0, 2)).toBe("Mitgelöscht werden: 2 Fotos")
    expect(mitgeloeschtText(0, 0)).toBeNull()
  })
})
