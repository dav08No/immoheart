import { describe, expect, it } from "vitest"
import { isoWocheSchluessel, letzteMonate, letzteWochen, monatLabel, monatSchluessel, wocheLabel } from "./zeitraeume"

describe("monatSchluessel", () => {
  it("bucketet nach Zürcher Lokalzeit, nicht nach UTC", () => {
    // 31.1.2026 23:30 UTC ist in Zürich (CET, UTC+1) bereits der 1.2.2026 00:30 --
    // ein UTC-basierter Monatsschlüssel würde hier fälschlich "2026-01" liefern.
    expect(monatSchluessel(new Date("2026-01-31T23:30:00Z"))).toBe("2026-02")
  })
  it("liefert den Monat bei eindeutiger Lokalzeit", () => {
    expect(monatSchluessel(new Date("2026-09-15T10:00:00Z"))).toBe("2026-09")
  })
})

describe("monatLabel", () => {
  it("formt feste deutsche Kürzel plus zweistelliges Jahr", () => {
    expect(monatLabel("2026-09")).toBe("Sep 26")
    expect(monatLabel("2025-12")).toBe("Dez 25")
    expect(monatLabel("2026-03")).toBe("Mär 26")
  })
})

describe("letzteMonate", () => {
  it("geht über einen Jahreswechsel zurück, älteste zuerst", () => {
    expect(letzteMonate(new Date("2026-01-15T10:00:00Z"), 3)).toEqual(["2025-11", "2025-12", "2026-01"])
  })
  it("liefert genau einen Monat bei anzahl=1", () => {
    expect(letzteMonate(new Date("2026-09-15T10:00:00Z"), 1)).toEqual(["2026-09"])
  })
})

describe("isoWocheSchluessel", () => {
  it("ordnet den 1.1.2021 (Freitag) noch der Woche 53/2020 zu", () => {
    expect(isoWocheSchluessel(new Date("2021-01-01T12:00:00Z"))).toBe("2020-W53")
  })
  it("ordnet den 4.1.2021 (Montag) der Woche 1/2021 zu", () => {
    expect(isoWocheSchluessel(new Date("2021-01-04T12:00:00Z"))).toBe("2021-W01")
  })
})

describe("wocheLabel", () => {
  it("formt 'KW <Nummer>' ohne führende Null", () => {
    expect(wocheLabel("2026-W39")).toBe("KW 39")
    expect(wocheLabel("2021-W01")).toBe("KW 1")
  })
})

describe("letzteWochen", () => {
  it("überquert den 53/1-Jahreswechsel korrekt", () => {
    expect(letzteWochen(new Date("2021-01-04T12:00:00Z"), 3)).toEqual(["2020-W52", "2020-W53", "2021-W01"])
  })
})
