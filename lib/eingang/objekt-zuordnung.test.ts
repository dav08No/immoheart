import { describe, expect, it } from "vitest"
import { findeObjektFuerMeldung, objektEckdaten } from "./objekt-zuordnung"

const LEER = { referenzen: [], gesendete: [], absender: "x@y.ch", aktiveNachEigentuemer: {} }

describe("findeObjektFuerMeldung", () => {
  it("ordnet über den Verlauf zu, jüngste Referenz gewinnt", () => {
    expect(
      findeObjektFuerMeldung({
        ...LEER,
        referenzen: ["<a>", "<b>"],
        gesendete: [
          { message_id: "<a>", objekt_id: "o1" },
          { message_id: "<b>", objekt_id: "o2" },
        ],
      })
    ).toEqual({ objektId: "o2", grund: "verlauf" })
  })

  it("überspringt gesendete Mails ohne Objekt", () => {
    expect(
      findeObjektFuerMeldung({
        ...LEER,
        referenzen: ["<a>", "<b>"],
        gesendete: [
          { message_id: "<a>", objekt_id: "o1" },
          { message_id: "<b>", objekt_id: null },
        ],
      })
    ).toEqual({ objektId: "o1", grund: "verlauf" })
  })

  it("Verlauf schlägt Eigentümer-Adresse", () => {
    expect(
      findeObjektFuerMeldung({
        referenzen: ["<a>"],
        gesendete: [{ message_id: "<a>", objekt_id: "o1" }],
        absender: "eigner@example.ch",
        aktiveNachEigentuemer: { "eigner@example.ch": ["o9"] },
      })
    ).toEqual({ objektId: "o1", grund: "verlauf" })
  })

  it("ordnet über den eindeutigen Eigentümer zu, unabhängig von Gross/Klein", () => {
    expect(
      findeObjektFuerMeldung({ ...LEER, absender: "Eigner@Example.CH", aktiveNachEigentuemer: { "eigner@example.ch": ["o1"] } })
    ).toEqual({ objektId: "o1", grund: "eigentuemer" })
  })

  it("zwei aktive Objekte desselben Eigentümers → keine Zuordnung", () => {
    expect(
      findeObjektFuerMeldung({ ...LEER, absender: "eigner@example.ch", aktiveNachEigentuemer: { "eigner@example.ch": ["o1", "o2"] } })
    ).toBeNull()
  })

  it("ohne Treffer → null", () => {
    expect(findeObjektFuerMeldung(LEER)).toBeNull()
  })
})

describe("objektEckdaten", () => {
  it("nennt Fläche, Preis und Ort", () => {
    expect(objektEckdaten({ flaeche: 200, preis_pro_m2: 180, ort: "Solothurn" })).toBe("200 m², CHF 180/m², Solothurn")
  })
  it("lässt fehlenden Preis weg", () => {
    expect(objektEckdaten({ flaeche: 200, preis_pro_m2: null, ort: "Grenchen" })).toBe("200 m², Grenchen")
  })
})
