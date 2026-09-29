import { describe, expect, it } from "vitest"
import { anfrageStatusTon, kontoStatusTon, objektStatusTon, pulsTon, trefferStatusTon } from "./status-ton"

describe("objektStatusTon", () => {
  it("ordnet jeden Objektstatus einem Ton zu", () => {
    expect(objektStatusTon("verfuegbar")).toBe("gut")
    expect(objektStatusTon("reserviert")).toBe("warn")
    expect(objektStatusTon("vermietet")).toBe("neutral")
  })
})

describe("anfrageStatusTon", () => {
  it("ordnet jeden Anfragestatus einem Ton zu", () => {
    expect(anfrageStatusTon("offen")).toBe("info")
    expect(anfrageStatusTon("vermittelt")).toBe("gut")
    expect(anfrageStatusTon("ruhend")).toBe("neutral")
  })
})

describe("pulsTon", () => {
  it("übernimmt die Pulsfarbe als Ton", () => {
    expect(pulsTon("gut")).toBe("gut")
    expect(pulsTon("warn")).toBe("warn")
    expect(pulsTon("kritisch")).toBe("kritisch")
  })
})

describe("kontoStatusTon", () => {
  it("ordnet jeden Kontostatus einem Ton zu", () => {
    expect(kontoStatusTon("eingeladen")).toBe("info")
    expect(kontoStatusTon("aktiv")).toBe("gut")
    expect(kontoStatusTon("deaktiviert")).toBe("neutral")
  })
})

describe("trefferStatusTon", () => {
  it("ordnet jeden Trefferstatus einem Ton zu", () => {
    expect(trefferStatusTon("neu")).toBe("info")
    expect(trefferStatusTon("gesendet")).toBe("info")
    expect(trefferStatusTon("verworfen")).toBe("neutral")
    expect(trefferStatusTon("reserviert")).toBe("warn")
    expect(trefferStatusTon("vermittelt")).toBe("gut")
    expect(trefferStatusTon("abgelehnt")).toBe("neutral")
    expect(trefferStatusTon("erledigt")).toBe("neutral")
  })
})
