import { describe, expect, it } from "vitest"
import { baueAngebote } from "./angebote"

const objekt = { id: "o1", titel: "Loft", status: "reserviert" as const }

describe("baueAngebote", () => {
  it("zählt andere angebotene Treffer desselben Objekts ohne den eigenen", () => {
    const [a] = baueAngebote(
      [{ id: "m1", status: "gesendet", angeboten_am: "2026-09-01", objekt: { ...objekt, status: "verfuegbar" } }],
      [
        { id: "m1", objekt_id: "o1", status: "gesendet", firma: "A" },
        { id: "m2", objekt_id: "o1", status: "gesendet", firma: "B" },
        { id: "m3", objekt_id: "o1", status: "gesendet", firma: "C" },
        { id: "m4", objekt_id: "o2", status: "gesendet", firma: "D" },
      ],
      new Map()
    )
    expect(a?.andereAngebote).toBe(2)
    expect(a?.reserviertFuer).toBeNull()
  })

  it("nennt die Firma, für die das Objekt anderweitig reserviert ist", () => {
    const [a] = baueAngebote(
      [{ id: "m1", status: "gesendet", angeboten_am: null, objekt }],
      [
        { id: "m1", objekt_id: "o1", status: "gesendet", firma: "A" },
        { id: "m2", objekt_id: "o1", status: "reserviert", firma: "Beta AG" },
      ],
      new Map()
    )
    expect(a?.reserviertFuer).toBe("Beta AG")
    expect(a?.andereAngebote).toBe(0)
  })

  it("eigene Reservierung ist kein reserviertFuer; fehlende Entwürfe je Objekt", () => {
    const [a] = baueAngebote(
      [{ id: "m1", status: "reserviert", angeboten_am: null, objekt }],
      [{ id: "m1", objekt_id: "o1", status: "reserviert", firma: "A" }],
      new Map([["o1", 2]])
    )
    expect(a?.reserviertFuer).toBeNull()
    expect(a?.fehlendeEntwuerfe).toBe(2)
  })

  it("Reservierung ohne Firmennamen fällt auf einen neutralen Namen zurück", () => {
    const [a] = baueAngebote(
      [{ id: "m1", status: "gesendet", angeboten_am: null, objekt }],
      [{ id: "m2", objekt_id: "o1", status: "reserviert", firma: null }],
      new Map()
    )
    expect(a?.reserviertFuer).toBe("eine andere Firma")
  })
})
