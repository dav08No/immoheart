import { describe, expect, it } from "vitest"
import { formatDatum, formatFlaeche, formatPreis, formatZeitpunkt } from "./format"

describe("formatFlaeche", () => {
  it("formatiert mit Tausendertrennzeichen und Einheit", () => {
    expect(formatFlaeche(2400)).toBe("2'400 m²")
  })
  it("lässt kleine Zahlen unverändert", () => {
    expect(formatFlaeche(240)).toBe("240 m²")
  })
  it("setzt mehrere Tausendertrennzeichen bei grossen Zahlen", () => {
    expect(formatFlaeche(1234567)).toBe("1'234'567 m²")
  })
})

describe("formatPreis", () => {
  it("formatiert als Schweizer Franken pro Quadratmeter", () => {
    expect(formatPreis(245)).toBe("CHF 245/m²")
  })
  it("rundet auf ganze Franken", () => {
    expect(formatPreis(244.6)).toBe("CHF 245/m²")
  })
})

describe("formatDatum", () => {
  it("formatiert als Tag.Monat.Jahr", () => {
    expect(formatDatum(new Date("2026-08-25"))).toBe("25.08.2026")
  })
  it("füllt auch den Tag mit führender Null", () => {
    expect(formatDatum(new Date("2026-08-05"))).toBe("05.08.2026")
  })
})

describe("formatZeitpunkt", () => {
  it("formatiert einen echten Zeitstempel im Schweizer Kalendertag (Europe/Zurich), nicht UTC", () => {
    // 2026-09-23T22:30:00Z ist in Zurich (UTC+2, Sommerzeit im September)
    // bereits 2026-09-24, 00:30 -- ein fester, umgebungsunabhängiger Fixpunkt.
    // Ein Test, der stattdessen `datum.getDate()` (lokale Getter des
    // Testrunners) zur Erwartung heranzöge, wäre je nach TZ der
    // ausführenden Maschine (Windows-Dev vs. Ubuntu-CI, beide i. d. R. nicht
    // auf Europe/Zurich gesetzt) unterschiedlich scharf -- deshalb hier ein
    // hart codierter erwarteter String.
    expect(formatZeitpunkt(new Date("2026-09-23T22:30:00.000Z"))).toBe("24.09.2026")
  })
  it("stimmt mit formatDatum überein, wenn der Zeitstempel weit vom Tageswechsel entfernt liegt", () => {
    expect(formatZeitpunkt(new Date("2026-08-25T12:00:00.000Z"))).toBe("25.08.2026")
  })
})
