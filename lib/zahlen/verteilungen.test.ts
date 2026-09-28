import { describe, expect, it } from "vitest"
import { groessenVerteilung, nutzungVerteilung, pulsVerteilung } from "./verteilungen"

describe("groessenVerteilung", () => {
  it("liefert alle Klassen mit Anzahl 0 bei leerer Eingabe", () => {
    expect(groessenVerteilung([])).toEqual([
      { bereich: "<200", anzahl: 0 },
      { bereich: "200–499", anzahl: 0 },
      { bereich: "500–999", anzahl: 0 },
      { bereich: "1000–2499", anzahl: 0 },
      { bereich: "≥2500", anzahl: 0 },
      { bereich: "unbekannt", anzahl: 0 },
    ])
  })

  it("nutzt die Mitte von min/max, wenn beide gesetzt sind", () => {
    // Mitte von 100 und 300 ist 200 -> Klasse "200–499"
    const ergebnis = groessenVerteilung([{ flaeche_min: 100, flaeche_max: 300 }])
    expect(ergebnis.find((r) => r.bereich === "200–499")?.anzahl).toBe(1)
  })

  it("nutzt flaeche_min, wenn nur min gesetzt ist", () => {
    const ergebnis = groessenVerteilung([{ flaeche_min: 600, flaeche_max: null }])
    expect(ergebnis.find((r) => r.bereich === "500–999")?.anzahl).toBe(1)
  })

  it("nutzt flaeche_max, wenn nur max gesetzt ist", () => {
    const ergebnis = groessenVerteilung([{ flaeche_min: null, flaeche_max: 2500 }])
    expect(ergebnis.find((r) => r.bereich === "≥2500")?.anzahl).toBe(1)
  })

  it("ordnet ohne min und max 'unbekannt' zu", () => {
    const ergebnis = groessenVerteilung([{ flaeche_min: null, flaeche_max: null }])
    expect(ergebnis.find((r) => r.bereich === "unbekannt")?.anzahl).toBe(1)
  })

  it("ordnet Klassengrenzen der oberen Klasse zu (halboffene Intervalle)", () => {
    const ergebnis = groessenVerteilung([
      { flaeche_min: 200, flaeche_max: 200 },
      { flaeche_min: 1000, flaeche_max: 1000 },
    ])
    expect(ergebnis.find((r) => r.bereich === "200–499")?.anzahl).toBe(1)
    expect(ergebnis.find((r) => r.bereich === "1000–2499")?.anzahl).toBe(1)
  })
})

describe("nutzungVerteilung", () => {
  it("liefert eine leere Liste ohne Anfragen", () => {
    expect(nutzungVerteilung([])).toEqual([])
  })

  it("zählt bekannte Nutzungen mit Label in fachlicher Reihenfolge, unbekannte danach", () => {
    const ergebnis = nutzungVerteilung([{ nutzung: "gewerbe" }, { nutzung: "buero" }, { nutzung: "buero" }, { nutzung: "sonstwas" }])
    expect(ergebnis).toEqual([
      { nutzung: "buero", label: "Büro", anzahl: 2 },
      { nutzung: "gewerbe", label: "Gewerbe", anzahl: 1 },
      { nutzung: "sonstwas", label: "sonstwas", anzahl: 1 },
    ])
  })
})

describe("pulsVerteilung", () => {
  const jetzt = new Date("2026-09-28T00:00:00Z")

  it("liefert Nullen ohne offene Anfragen", () => {
    expect(pulsVerteilung([], jetzt)).toEqual({ gut: 0, warn: 0, kritisch: 0 })
  })

  it("verteilt auf gut/warn/kritisch anhand von puls()", () => {
    const ergebnis = pulsVerteilung(
      [
        { letzter_kontakt: "2026-09-27T00:00:00Z" }, // 1 Tag -> puls 99 -> gut
        { letzter_kontakt: "2026-08-15T00:00:00Z" }, // 44 Tage -> puls 56 -> warn
        { letzter_kontakt: "2026-01-01T00:00:00Z" }, // weit über 100 Tage -> puls 4 -> kritisch
      ],
      jetzt
    )
    expect(ergebnis).toEqual({ gut: 1, warn: 1, kritisch: 1 })
  })
})
