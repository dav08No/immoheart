import { describe, expect, it } from "vitest"
import { objektVorbelegung } from "./objekt-vorbelegung"

const basis = {
  richtung: "eingang",
  kategorie: "objektangebot",
  geloescht_am: null,
  von: "eigentuemer@firma.ch",
} as const

describe("objektVorbelegung", () => {
  it("liefert null, wenn keine Eingangs-Zeile gefunden wurde", () => {
    expect(objektVorbelegung(null)).toBeNull()
  })

  it("liefert null bei anderer richtung als eingang", () => {
    expect(objektVorbelegung({ ...basis, richtung: "entwurf", erkannte_felder: null })).toBeNull()
  })

  it("liefert null bei anderer Kategorie als objektangebot", () => {
    expect(objektVorbelegung({ ...basis, kategorie: "suchanfrage", erkannte_felder: null })).toBeNull()
  })

  it("liefert null bei einer gelöschten Mail", () => {
    expect(objektVorbelegung({ ...basis, geloescht_am: "2026-09-27T08:00:00Z", erkannte_felder: null })).toBeNull()
  })

  it("übernimmt erkannte Objektdaten und wandelt Zahlen in Strings um", () => {
    const erkannteFelder = {
      objekt: {
        titel: "Halle Nord",
        adresse: "Bahnhofstrasse 1",
        ort: "Solothurn",
        flaeche: 450,
        preis_pro_m2: 180,
        nutzung: "lager",
        verfuegbar_ab: "2026-11-01",
        beschreibung: "Trockene Lagerhalle",
      },
    }
    expect(objektVorbelegung({ ...basis, erkannte_felder: erkannteFelder })).toEqual({
      titel: "Halle Nord",
      adresse: "Bahnhofstrasse 1",
      ort: "Solothurn",
      flaeche: "450",
      preis: "180",
      nutzung: "lager",
      verfuegbarAb: "2026-11-01",
      eigentuemer: "eigentuemer@firma.ch",
    })
  })

  it("setzt Eigentümer immer aus der Absenderadresse, unabhängig von erkannte_felder", () => {
    expect(objektVorbelegung({ ...basis, erkannte_felder: null })).toEqual({
      titel: undefined,
      adresse: undefined,
      ort: undefined,
      flaeche: undefined,
      preis: undefined,
      nutzung: undefined,
      verfuegbarAb: undefined,
      eigentuemer: "eigentuemer@firma.ch",
    })
  })
})
