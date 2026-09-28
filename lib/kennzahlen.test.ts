import { describe, expect, it } from "vitest"
import { berechneKennzahlen, waehleHighlights } from "./kennzahlen"

describe("berechneKennzahlen", () => {
  it("zählt Objekte, summiert Flächen und zählt Orte unabhängig von Gross-/Kleinschreibung", () => {
    const k = berechneKennzahlen([
      { ort: "Solothurn", flaeche: 500 },
      { ort: " solothurn ", flaeche: 250 },
      { ort: "Grenchen", flaeche: 1000 },
    ])
    expect(k).toEqual({ objekte: 3, flaecheTotal: 1750, orte: 2 })
  })

  it("liefert Nullen ohne Objekte und zählt leere Orte nicht", () => {
    expect(berechneKennzahlen([])).toEqual({ objekte: 0, flaecheTotal: 0, orte: 0 })
    expect(berechneKennzahlen([{ ort: "  ", flaeche: 10 }])).toEqual({ objekte: 1, flaecheTotal: 10, orte: 0 })
  })
})

describe("waehleHighlights", () => {
  const objekte = [
    { id: "alt-mit-bild", titelbild: "a.jpg", created_at: "2026-01-01T00:00:00Z" },
    { id: "neu-ohne-bild", titelbild: null, created_at: "2026-09-01T00:00:00Z" },
    { id: "neu-mit-bild", titelbild: "b.jpg", created_at: "2026-08-01T00:00:00Z" },
    { id: "mittel-ohne-bild", titelbild: null, created_at: "2026-05-01T00:00:00Z" },
  ]

  it("nimmt Objekte mit Bild zuerst, dann die neuesten", () => {
    expect(waehleHighlights(objekte, 3).map((o) => o.id)).toEqual(["neu-mit-bild", "alt-mit-bild", "neu-ohne-bild"])
  })

  it("begrenzt auf max und verändert die Eingabe nicht", () => {
    const kopie = [...objekte]
    expect(waehleHighlights(objekte, 10)).toHaveLength(4)
    expect(waehleHighlights(objekte, 0)).toEqual([])
    expect(objekte).toEqual(kopie)
  })
})
