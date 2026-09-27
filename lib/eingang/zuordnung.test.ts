import { describe, expect, it } from "vitest"
import { anfrageKurz, findeAnfrageFuerAntwort } from "./zuordnung"

const gesendete = [
  { message_id: "<a@x>", anfrage_id: "anfrage-1" },
  { message_id: "<b@x>", anfrage_id: "anfrage-2" },
  { message_id: "<c@x>", anfrage_id: null },
]

describe("findeAnfrageFuerAntwort", () => {
  it("findet die Anfrage über den Verlauf", () => {
    expect(
      findeAnfrageFuerAntwort({ referenzen: ["<a@x>"], gesendete, absender: "x@firma.ch", offeneNachAbsender: {} })
    ).toEqual({ anfrageId: "anfrage-1", grund: "verlauf" })
  })

  it("nimmt bei mehreren Treffern die neueste (letzte) Referenz", () => {
    expect(
      findeAnfrageFuerAntwort({ referenzen: ["<a@x>", "<b@x>"], gesendete, absender: "x@firma.ch", offeneNachAbsender: {} })
    ).toEqual({ anfrageId: "anfrage-2", grund: "verlauf" })
  })

  it("überspringt Referenzen auf gesendete Mails ohne Anfrage", () => {
    expect(
      findeAnfrageFuerAntwort({ referenzen: ["<a@x>", "<c@x>"], gesendete, absender: "x@firma.ch", offeneNachAbsender: {} })
    ).toEqual({ anfrageId: "anfrage-1", grund: "verlauf" })
  })

  it("findet genau eine offene Anfrage über den Absender", () => {
    expect(
      findeAnfrageFuerAntwort({
        referenzen: ["<fremd@y>"],
        gesendete,
        absender: "X@Firma.ch",
        offeneNachAbsender: { "x@firma.ch": ["anfrage-9"] },
      })
    ).toEqual({ anfrageId: "anfrage-9", grund: "absender" })
  })

  it("gibt bei mehreren offenen Anfragen des Absenders null zurück", () => {
    expect(
      findeAnfrageFuerAntwort({
        referenzen: [],
        gesendete,
        absender: "x@firma.ch",
        offeneNachAbsender: { "x@firma.ch": ["anfrage-8", "anfrage-9"] },
      })
    ).toBeNull()
  })

  it("gibt ohne Treffer null zurück", () => {
    expect(
      findeAnfrageFuerAntwort({ referenzen: [], gesendete, absender: "x@firma.ch", offeneNachAbsender: {} })
    ).toBeNull()
  })

  it("Verlauf schlägt Absender", () => {
    expect(
      findeAnfrageFuerAntwort({
        referenzen: ["<a@x>"],
        gesendete,
        absender: "x@firma.ch",
        offeneNachAbsender: { "x@firma.ch": ["anfrage-9"] },
      })
    ).toEqual({ anfrageId: "anfrage-1", grund: "verlauf" })
  })
})

describe("anfrageKurz", () => {
  it("fasst die bekannten Angaben in einer Zeile zusammen", () => {
    expect(
      anfrageKurz({ nutzung: "buero", flaeche_min: 180, flaeche_max: 260, ort: "Solothurn", budget_pro_m2: 250, bezug: "Q4 2026" })
    ).toBe("Büro, 180–260 m², Solothurn, Budget CHF 250/m², Bezug Q4 2026")
  })
  it("lässt fehlende Angaben weg", () => {
    expect(
      anfrageKurz({ nutzung: "lager", flaeche_min: null, flaeche_max: 500, ort: null, budget_pro_m2: null, bezug: null })
    ).toBe("Lager, bis 500 m²")
  })
  it("gibt ohne Anfrage null zurück", () => {
    expect(anfrageKurz(null)).toBeNull()
  })
})
