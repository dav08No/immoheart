import { describe, expect, it } from "vitest"
import { baueAbsagePrompt, baueBestaetigungPrompt, baueEigentuemerInfoPrompt } from "./abschluss-entwuerfe"
import { AUSGABEFORMAT } from "./entwuerfe"

describe("baueAbsagePrompt", () => {
  it("enthält Objekttitel, Rolle, AUSGABEFORMAT und Erfinde-nicht-Anweisung", () => {
    const prompt = baueAbsagePrompt({ objektTitel: "Lagerhalle Zuchwil", anfrageKurz: "Lager, 500 m²" })
    expect(prompt).toContain("Lagerhalle Zuchwil")
    expect(prompt).toContain("immoheart")
    expect(prompt).toContain("Lager, 500 m²")
    expect(prompt).toContain("Erfinde keine")
    expect(prompt).toContain(AUSGABEFORMAT)
  })
  it("funktioniert ohne anfrageKurz", () => {
    const prompt = baueAbsagePrompt({ objektTitel: "Lagerhalle Zuchwil", anfrageKurz: null })
    expect(prompt).toContain("Lagerhalle Zuchwil")
    expect(prompt).not.toContain("null")
  })
})

describe("baueEigentuemerInfoPrompt", () => {
  it("enthält je Anlass eine eigene, klare Anweisung", () => {
    const reserviert = baueEigentuemerInfoPrompt({ objektTitel: "Büro Altstadt", anlass: "reserviert" })
    const vermietet = baueEigentuemerInfoPrompt({ objektTitel: "Büro Altstadt", anlass: "vermietet" })
    const aufgehoben = baueEigentuemerInfoPrompt({ objektTitel: "Büro Altstadt", anlass: "aufgehoben" })
    const dank = baueEigentuemerInfoPrompt({ objektTitel: "Büro Altstadt", anlass: "meldung_dank" })
    expect(reserviert).toContain("reserviert")
    expect(vermietet).toContain("vermietet")
    expect(aufgehoben).toContain("aufgehoben")
    expect(dank).toContain("Meldung")
    expect(reserviert).not.toBe(vermietet)
    expect(vermietet).not.toBe(aufgehoben)
    expect(aufgehoben).not.toBe(dank)
    for (const prompt of [reserviert, vermietet, aufgehoben, dank]) {
      expect(prompt).toContain("Büro Altstadt")
      expect(prompt).toContain("immoheart")
      expect(prompt).toContain("Erfinde keine")
      expect(prompt).toContain(AUSGABEFORMAT)
    }
  })
  it("zitiert die optionale Meldung bei meldung_dank", () => {
    const prompt = baueEigentuemerInfoPrompt({
      objektTitel: "Büro Altstadt", anlass: "meldung_dank", meldung: "Fläche ist ab sofort wieder frei.",
    })
    expect(prompt).toContain("Fläche ist ab sofort wieder frei.")
  })
  it("funktioniert ohne meldung", () => {
    const prompt = baueEigentuemerInfoPrompt({ objektTitel: "Büro Altstadt", anlass: "reserviert" })
    expect(prompt).not.toContain("undefined")
  })
})

describe("baueBestaetigungPrompt", () => {
  it("enthält Objekttitel, Rolle, AUSGABEFORMAT und Firma", () => {
    const prompt = baueBestaetigungPrompt({ objektTitel: "Lager Zuchwil", firma: "Muster AG" })
    expect(prompt).toContain("Lager Zuchwil")
    expect(prompt).toContain("Muster AG")
    expect(prompt).toContain("immoheart")
    expect(prompt).toContain("Erfinde keine")
    expect(prompt).toContain(AUSGABEFORMAT)
  })
  it("funktioniert ohne firma", () => {
    const prompt = baueBestaetigungPrompt({ objektTitel: "Lager Zuchwil", firma: null })
    expect(prompt).toContain("Lager Zuchwil")
    expect(prompt).not.toContain("null")
  })
})
