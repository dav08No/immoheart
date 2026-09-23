import { describe, expect, it } from "vitest"
import { baueErkennungsPrompt, parseErkennungsAntwort } from "./erkennung"

describe("baueErkennungsPrompt", () => {
  it("enthält den übergebenen Mailtext", () => {
    const prompt = baueErkennungsPrompt("Wir suchen 500 m² in Solothurn.")
    expect(prompt).toContain("Wir suchen 500 m² in Solothurn.")
  })
})

describe("parseErkennungsAntwort", () => {
  it("parst ein vollständiges JSON-Objekt", () => {
    const antwort =
      '{"firma":"Muster AG","flaeche_min":500,"flaeche_max":800,"ort":"Solothurn","budget_pro_m2":200,"bezug":"Q1 2027","branche":"Handel","nutzung":"lager"}'
    expect(parseErkennungsAntwort(antwort)).toEqual({
      firma: "Muster AG", flaeche_min: 500, flaeche_max: 800, ort: "Solothurn",
      budget_pro_m2: 200, bezug: "Q1 2027", branche: "Handel", nutzung: "lager",
    })
  })

  it("entfernt Markdown-Codezäune um das JSON", () => {
    const antwort =
      '```json\n{"firma":"Muster AG","flaeche_min":null,"flaeche_max":null,"ort":null,"budget_pro_m2":null,"bezug":null,"branche":null,"nutzung":null}\n```'
    expect(parseErkennungsAntwort(antwort).firma).toBe("Muster AG")
  })

  it("setzt fehlende Felder auf null statt sie wegzulassen", () => {
    const antwort = '{"firma":"Muster AG"}'
    const ergebnis = parseErkennungsAntwort(antwort)
    expect(ergebnis.ort).toBeNull()
    expect(ergebnis.budget_pro_m2).toBeNull()
    expect(ergebnis.nutzung).toBeNull()
  })

  it("verwirft einen Wert mit falschem Typ statt ihn zu übernehmen", () => {
    expect(parseErkennungsAntwort('{"flaeche_min":"fünfhundert"}').flaeche_min).toBeNull()
  })

  it("verwirft eine nutzung ausserhalb des erlaubten Enums", () => {
    expect(parseErkennungsAntwort('{"nutzung":"garage"}').nutzung).toBeNull()
  })
})
