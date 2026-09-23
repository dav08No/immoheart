import { describe, expect, it } from "vitest"
import { punkteFlaeche } from "./matching"
import type { Anfrage, Objekt } from "@/types"

function anfrage(teil: Partial<Anfrage> = {}): Anfrage {
  return {
    id: "a1", flaecheMin: 180, flaecheMax: 260, ort: "Solothurn",
    budgetProM2: 250, bezug: "Q4 2026", nutzung: "buero",
    anforderungen: {}, letzterKontakt: new Date(), ...teil,
  }
}

function objekt(teil: Partial<Objekt> = {}): Objekt {
  return {
    id: "o1", titel: "Test", ort: "Solothurn", flaeche: 240,
    preisProM2: 245, nutzung: "buero", eigenschaften: {},
    verfuegbarAb: new Date(), ...teil,
  }
}

describe("punkteFlaeche", () => {
  it("gibt volle Punktzahl innerhalb der Spanne", () => {
    expect(punkteFlaeche(anfrage(), objekt({ flaeche: 240 }))).toBe(100)
  })
  it("nimmt linear ab oberhalb der Spanne", () => {
    const punkte = punkteFlaeche(anfrage({ flaecheMax: 260 }), objekt({ flaeche: 286 }))
    expect(punkte).toBeCloseTo(90, 0)
  })
  it("nimmt linear ab unterhalb der Spanne", () => {
    const punkte = punkteFlaeche(anfrage({ flaecheMin: 180 }), objekt({ flaeche: 162 }))
    expect(punkte).toBeCloseTo(90, 0)
  })
  it("behandelt eine offene Untergrenze (ab X m²) als erfüllt, wenn das Objekt grösser ist", () => {
    expect(punkteFlaeche(anfrage({ flaecheMin: 2200, flaecheMax: null }), objekt({ flaeche: 2400 }))).toBe(100)
  })
  it("liefert 50 wenn beide Grenzen fehlen", () => {
    expect(punkteFlaeche(anfrage({ flaecheMin: null, flaecheMax: null }), objekt({ flaeche: 500 }))).toBe(50)
  })
  it("liefert 0 statt fälschlich 100 bei einer expliziten Obergrenze von 0", () => {
    // flaecheMax: 0 ist kein null (kein DB-CHECK-Constraint schliesst es aus)
    // und bedeutet damit explizit "0 m² max", nicht "keine Obergrenze".
    expect(punkteFlaeche(anfrage({ flaecheMin: null, flaecheMax: 0 }), objekt({ flaeche: 5000 }))).toBe(0)
  })
})
