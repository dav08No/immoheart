import { describe, expect, it } from "vitest"
import { baueEinordnungsPrompt, parseEinordnung } from "./einordnung"

describe("baueEinordnungsPrompt", () => {
  it("enthält Betreff, Text und alle fünf Kategorien", () => {
    const prompt = baueEinordnungsPrompt("Lagerfläche gesucht", "Wir suchen 500 m² in Solothurn.")
    expect(prompt).toContain("Lagerfläche gesucht")
    expect(prompt).toContain("Wir suchen 500 m² in Solothurn.")
    expect(prompt).toContain("suchanfrage")
    expect(prompt).toContain("antwort")
    expect(prompt).toContain("objektangebot")
    expect(prompt).toContain("objektmeldung")
    expect(prompt).toContain("sonstiges")
  })
  it("erklärt meldung und kein_interesse im Ausgabeformat", () => {
    const prompt = baueEinordnungsPrompt("Betreff", "Text")
    expect(prompt).toContain("meldung")
    expect(prompt).toContain("kein_interesse")
    expect(prompt).toContain("nicht_verfuegbar")
    expect(prompt).toContain("wieder_verfuegbar")
    expect(prompt).toContain("sonstige_aenderung")
  })
})

describe("parseEinordnung", () => {
  it("parst ein vollständiges JSON-Objekt mit Codezaun", () => {
    const antwort = `\`\`\`json
{"kategorie":"suchanfrage","felder":{"firma":"Muster AG","flaeche_min":500,"flaeche_max":800,"ort":"Solothurn","budget_pro_m2":200,"bezug":"Q1 2027","branche":"Handel","nutzung":"lager"},"objekt":{"titel":null,"adresse":null,"ort":null,"flaeche":null,"preis_pro_m2":null,"nutzung":null,"verfuegbar_ab":null,"beschreibung":null}}
\`\`\``
    const ergebnis = parseEinordnung(antwort)
    expect(ergebnis.kategorie).toBe("suchanfrage")
    expect(ergebnis.felder.firma).toBe("Muster AG")
    expect(ergebnis.felder.nutzung).toBe("lager")
    expect(ergebnis.objekt.titel).toBeNull()
  })

  it("setzt eine unbekannte Kategorie auf sonstiges", () => {
    expect(parseEinordnung('{"kategorie":"unbekannt"}').kategorie).toBe("sonstiges")
  })

  it("verwirft Objekt-Felder mit falschem Typ statt sie zu übernehmen", () => {
    const antwort = '{"kategorie":"objektangebot","objekt":{"flaeche":"gross","preis_pro_m2":"teuer","nutzung":"garage"}}'
    const ergebnis = parseEinordnung(antwort)
    expect(ergebnis.objekt.flaeche).toBeNull()
    expect(ergebnis.objekt.preis_pro_m2).toBeNull()
    expect(ergebnis.objekt.nutzung).toBeNull()
  })

  it("akzeptiert nur ein gültiges YYYY-MM-DD-Datum für verfuegbar_ab", () => {
    expect(parseEinordnung('{"objekt":{"verfuegbar_ab":"2027-03-01"}}').objekt.verfuegbar_ab).toBe("2027-03-01")
    expect(parseEinordnung('{"objekt":{"verfuegbar_ab":"01.03.2027"}}').objekt.verfuegbar_ab).toBeNull()
    expect(parseEinordnung('{"objekt":{"verfuegbar_ab":"sofort"}}').objekt.verfuegbar_ab).toBeNull()
  })

  it("setzt fehlende felder/objekt-Teile auf null statt sie wegzulassen", () => {
    const ergebnis = parseEinordnung('{"kategorie":"antwort"}')
    expect(ergebnis.felder.firma).toBeNull()
    expect(ergebnis.felder.nutzung).toBeNull()
    expect(ergebnis.objekt.beschreibung).toBeNull()
  })

  it("wirft bei kaputtem JSON", () => {
    expect(() => parseEinordnung("{kaputt")).toThrow()
  })

  it("parst eine objektmeldung mit aenderung und zusammenfassung", () => {
    const antwort = '{"kategorie":"objektmeldung","meldung":{"aenderung":"nicht_verfuegbar","zusammenfassung":"Fläche vermietet."}}'
    const ergebnis = parseEinordnung(antwort)
    expect(ergebnis.kategorie).toBe("objektmeldung")
    expect(ergebnis.meldung).toEqual({ aenderung: "nicht_verfuegbar", zusammenfassung: "Fläche vermietet." })
  })

  it("setzt eine unbekannte aenderung auf sonstige_aenderung", () => {
    const antwort = '{"kategorie":"objektmeldung","meldung":{"aenderung":"unbekannt","zusammenfassung":"Text"}}'
    expect(parseEinordnung(antwort).meldung?.aenderung).toBe("sonstige_aenderung")
  })

  it("setzt meldung auf null, wenn sie fehlt", () => {
    expect(parseEinordnung('{"kategorie":"suchanfrage"}').meldung).toBeNull()
  })

  it("setzt kein_interesse nur bei echtem boolean true", () => {
    expect(parseEinordnung('{"kategorie":"antwort","kein_interesse":true}').kein_interesse).toBe(true)
    expect(parseEinordnung('{"kategorie":"antwort","kein_interesse":"true"}').kein_interesse).toBe(false)
    expect(parseEinordnung('{"kategorie":"antwort"}').kein_interesse).toBe(false)
  })
})
