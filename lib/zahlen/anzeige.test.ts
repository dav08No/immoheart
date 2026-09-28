import { describe, expect, it } from "vitest"
import { erstesAngebotJeAnfrage, formatProzent, formatTage, istLeer } from "./anzeige"

describe("istLeer", () => {
  it("ist leer ohne Zeilen und bei lauter Nullen", () => {
    expect(istLeer<{ a: number }>([], ["a"])).toBe(true)
    expect(istLeer([{ label: "x", a: 0, b: 0 }], ["a", "b"])).toBe(true)
  })

  it("ist nicht leer, sobald ein Wert > 0 ist", () => {
    expect(istLeer([{ a: 0, b: 0 }, { a: 0, b: 2 }], ["a", "b"])).toBe(false)
  })

  it("ignoriert Spalten ausserhalb der Schlüssel", () => {
    expect(istLeer([{ a: 0, b: 5 }], ["a"])).toBe(true)
  })
})

describe("formatProzent", () => {
  it("rundet auf ganze Prozent", () => {
    expect(formatProzent(0)).toBe("0 %")
    expect(formatProzent(0.4166)).toBe("42 %")
    expect(formatProzent(1)).toBe("100 %")
  })
})

describe("formatTage", () => {
  it("zeigt eine Nachkommastelle, ganze Tage ohne", () => {
    expect(formatTage(2.46)).toBe("2.5")
    expect(formatTage(3)).toBe("3")
    expect(formatTage(0.04)).toBe("0")
  })
})

describe("erstesAngebotJeAnfrage", () => {
  const erstellt = { a1: "2026-09-01T08:00:00Z", a2: "2026-09-05T08:00:00Z" }

  it("nimmt je Anfrage nur das früheste Angebot", () => {
    const ergebnis = erstesAngebotJeAnfrage(
      [
        { anfrage_id: "a1", gesendet_am: "2026-09-04T08:00:00Z" },
        { anfrage_id: "a1", gesendet_am: "2026-09-02T08:00:00Z" },
        { anfrage_id: "a2", gesendet_am: "2026-09-06T08:00:00Z" },
      ],
      erstellt
    )
    expect(ergebnis).toEqual([
      { anfrage_erstellt: "2026-09-01T08:00:00Z", gesendet_am: "2026-09-02T08:00:00Z" },
      { anfrage_erstellt: "2026-09-05T08:00:00Z", gesendet_am: "2026-09-06T08:00:00Z" },
    ])
  })

  it("überspringt Angebote ohne Anfrage, ohne Versanddatum oder zu unbekannter Anfrage", () => {
    const ergebnis = erstesAngebotJeAnfrage(
      [
        { anfrage_id: null, gesendet_am: "2026-09-02T08:00:00Z" },
        { anfrage_id: "a1", gesendet_am: null },
        { anfrage_id: "fremd", gesendet_am: "2026-09-02T08:00:00Z" },
      ],
      erstellt
    )
    expect(ergebnis).toEqual([])
  })
})
