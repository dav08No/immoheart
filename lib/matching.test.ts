import { describe, expect, it } from "vitest"
import { punkteAnforderungen, punkteBezug, punkteFlaeche, punkteLage, punktePreis } from "./matching"
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

describe("punktePreis", () => {
  it("gibt volle Punktzahl bei exaktem Budget", () => {
    expect(punktePreis(anfrage({ budgetProM2: 250 }), objekt({ preisProM2: 250 }))).toBe(100)
  })
  it("gibt volle Punktzahl bei Unterschreitung", () => {
    expect(punktePreis(anfrage({ budgetProM2: 250 }), objekt({ preisProM2: 200 }))).toBe(100)
  })
  it("gibt noch volle Punktzahl bis 12% über Budget", () => {
    expect(punktePreis(anfrage({ budgetProM2: 200 }), objekt({ preisProM2: 224 }))).toBe(100)
  })
  it("nimmt danach steil ab", () => {
    const punkte = punktePreis(anfrage({ budgetProM2: 200 }), objekt({ preisProM2: 240 }))
    expect(punkte).toBeLessThan(100)
    expect(punkte).toBeGreaterThanOrEqual(0)
  })
  it("liefert 50 wenn kein Budget genannt ist", () => {
    expect(punktePreis(anfrage({ budgetProM2: null }), objekt({ preisProM2: 200 }))).toBe(50)
  })
  it("liefert 50 wenn das Objekt keinen Preis hat (auf Anfrage)", () => {
    expect(punktePreis(anfrage({ budgetProM2: 200 }), objekt({ preisProM2: null }))).toBe(50)
  })
  it("liefert 0 statt fälschlich 100 bei einem expliziten Budget von 0", () => {
    // budgetProM2: 0 ist kein null (kein DB-CHECK-Constraint schliesst es aus)
    // und bedeutet damit explizit "0 CHF/m² Budget". Ohne Sonderfall-Guard
    // sorgt IEEE-754 (positive/0 = Infinity) dafür, dass Math.max(0, ...) korrekt 0 liefert.
    expect(punktePreis(anfrage({ budgetProM2: 0 }), objekt({ preisProM2: 200 }))).toBe(0)
  })
})

describe("punkteLage", () => {
  it("gibt volle Punktzahl bei gleichem Ort", () => {
    expect(punkteLage(anfrage({ ort: "Solothurn" }), objekt({ ort: "Solothurn" }))).toBe(100)
  })
  it("gibt Teilpunkte bei gleicher Region", () => {
    expect(punkteLage(anfrage({ ort: "Wasseramt" }), objekt({ ort: "Zuchwil" }))).toBe(60)
  })
  it("gibt wenig Punkte bei unterschiedlicher Region", () => {
    expect(punkteLage(anfrage({ ort: "Solothurn" }), objekt({ ort: "Bettlach" }))).toBeLessThan(60)
  })
  it("liefert 50 wenn kein Ort genannt ist", () => {
    expect(punkteLage(anfrage({ ort: null }), objekt())).toBe(50)
  })
})

describe("punkteBezug", () => {
  it("gibt volle Punktzahl wenn beide 'sofort' sind", () => {
    expect(punkteBezug(anfrage({ bezug: "sofort" }), objekt({ verfuegbarAb: new Date() }))).toBe(100)
  })
  it("gibt Teilpunkte bei bis zu einem Monat Abweichung", () => {
    const inDreiWochen = new Date(Date.now() + 21 * 86_400_000)
    expect(punkteBezug(anfrage({ bezug: "sofort" }), objekt({ verfuegbarAb: inDreiWochen }))).toBe(60)
  })
  it("liefert 50 wenn kein Bezugstermin genannt ist", () => {
    expect(punkteBezug(anfrage({ bezug: null }), objekt({ verfuegbarAb: new Date() }))).toBe(50)
  })
})

describe("punkteAnforderungen", () => {
  it("liefert 100 wenn keine Anforderungen gestellt sind", () => {
    expect(punkteAnforderungen(anfrage({ anforderungen: {} }), objekt())).toBe(100)
  })
  it("liefert 100 wenn alle Anforderungen erfüllt sind", () => {
    const a = anfrage({ anforderungen: { rampe: true } })
    const o = objekt({ eigenschaften: { rampe: true } })
    expect(punkteAnforderungen(a, o)).toBe(100)
  })
  it("liefert den Anteil erfüllter Anforderungen", () => {
    const a = anfrage({ anforderungen: { rampe: true, kran_tonnen: 16 } })
    const o = objekt({ eigenschaften: { rampe: true, kran_tonnen: 10 } })
    expect(punkteAnforderungen(a, o)).toBe(50)
  })
  it("liefert 0 wenn nichts erfüllt ist", () => {
    const a = anfrage({ anforderungen: { rampe: true } })
    const o = objekt({ eigenschaften: {} })
    expect(punkteAnforderungen(a, o)).toBe(0)
  })
  it("vergleicht Text-Anforderungen exakt", () => {
    const a = anfrage({ anforderungen: { zugang: "24/7" } })
    const o = objekt({ eigenschaften: { zugang: "24/7" } })
    expect(punkteAnforderungen(a, o)).toBe(100)
  })
})
