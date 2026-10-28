import { describe, expect, it } from "vitest"
import { imZeitraum, rapportZeitraum, tageZwischen } from "./zeitraum"

describe("rapportZeitraum", () => {
  it("geht von heute minus 1 Jahr bis heute, mit 13 Monaten", () => {
    const z = rapportZeitraum(new Date("2026-10-27T10:00:00Z"))
    expect(z.von).toBe("2025-10-27")
    expect(z.bis).toBe("2026-10-27")
    expect(z.label).toBe("27.10.2025 – 27.10.2026")
    expect(z.monate).toHaveLength(13)
    expect(z.monate[0]).toEqual({ schluessel: "2025-10", label: "Okt 25" })
    expect(z.monate[12]).toEqual({ schluessel: "2026-10", label: "Okt 26" })
    // Puffer von einem Tag, weil die DB in UTC filtert und der Rest rein gefiltert wird.
    expect(z.abfrageAb).toBe("2025-10-26")
  })

  it("macht aus dem 29.02. den 28.02. des Vorjahres", () => {
    const z = rapportZeitraum(new Date("2028-02-29T12:00:00Z"))
    expect(z.von).toBe("2027-02-28")
    expect(z.bis).toBe("2028-02-29")
    expect(z.label).toBe("28.02.2027 – 29.02.2028")
    expect(z.monate[0]?.label).toBe("Feb 27")
    expect(z.monate[12]?.label).toBe("Feb 28")
  })

  it("rechnet in Schweizer Zeit: 23:30 UTC am 31.10. ist schon der 1.11.", () => {
    const z = rapportZeitraum(new Date("2026-10-31T23:30:00Z"))
    expect(z.bis).toBe("2026-11-01")
    expect(z.von).toBe("2025-11-01")
    expect(z.monate.map((m) => m.label)).toEqual([
      "Nov 25", "Dez 25", "Jan 26", "Feb 26", "Mär 26", "Apr 26", "Mai 26",
      "Jun 26", "Jul 26", "Aug 26", "Sep 26", "Okt 26", "Nov 26",
    ])
  })

  it("nimmt am Monatsletzten denselben Tag im Vorjahr", () => {
    const z = rapportZeitraum(new Date("2026-03-31T10:00:00Z"))
    expect(z.von).toBe("2025-03-31")
    expect(z.monate[0]?.label).toBe("Mär 25")
    expect(z.monate[12]?.label).toBe("Mär 26")
  })

  it("geht über den Jahreswechsel", () => {
    const z = rapportZeitraum(new Date("2025-12-31T23:30:00Z"))
    expect(z.von).toBe("2025-01-01")
    expect(z.bis).toBe("2026-01-01")
    expect(z.abfrageAb).toBe("2024-12-31")
    expect(z.monate[0]?.schluessel).toBe("2025-01")
    expect(z.monate[12]?.schluessel).toBe("2026-01")
  })
})

describe("imZeitraum", () => {
  const z = rapportZeitraum(new Date("2026-10-27T10:00:00Z"))

  it("schliesst beide Randtage nach Zürcher Zeit ein", () => {
    // 26.10.2025 23:30 UTC ist in Zürich (CET) schon der 27.10.2025 00:30.
    expect(imZeitraum(z, "2025-10-26T23:30:00Z")).toBe(true)
    expect(imZeitraum(z, "2025-10-26T22:30:00Z")).toBe(false)
    expect(imZeitraum(z, "2026-10-27T22:59:00Z")).toBe(true)
    expect(imZeitraum(z, "2026-10-27T23:00:00Z")).toBe(false)
  })

  it("zieht die Grenze im Sommer bei 22:00 UTC (CEST)", () => {
    const sommer = rapportZeitraum(new Date("2026-06-15T10:00:00Z"))
    expect(imZeitraum(sommer, "2026-06-15T21:59:00Z")).toBe(true)
    expect(imZeitraum(sommer, "2026-06-15T22:00:00Z")).toBe(false)
  })

  it("ist für fehlende Daten falsch", () => {
    expect(imZeitraum(z, null)).toBe(false)
  })
})

describe("tageZwischen", () => {
  it("rechnet Tage auf eine Nachkommastelle", () => {
    expect(tageZwischen("2025-11-03T09:00:00Z", "2026-01-20T09:00:00Z")).toBe(78)
    expect(tageZwischen("2026-01-01T00:00:00Z", "2026-01-01T12:00:00Z")).toBe(0.5)
  })
  it("liefert null für negative Spannen (Eingabefehler)", () => {
    expect(tageZwischen("2026-01-02T00:00:00Z", "2026-01-01T00:00:00Z")).toBeNull()
  })
})
