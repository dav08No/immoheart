import { describe, expect, it } from "vitest"
import { berechneMatch, punkteAnforderungen, punkteBezug, punkteFlaeche, punkteLage, punktePreis } from "./matching"
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

describe("berechneMatch", () => {
  it("liefert null unter Score 60", () => {
    const a = anfrage({ flaecheMin: 5000, flaecheMax: 6000, budgetProM2: 50 })
    const o = objekt({ flaeche: 100, preisProM2: 500 })
    expect(berechneMatch(a, o)).toBeNull()
  })

  it("berechnet den gewichteten Score bei vollem Treffer", () => {
    // bezug:"sofort" statt des Default-Freitexts "Q4 2026", damit auch das
    // Bezugskriterium bei sofortiger Verfügbarkeit volle 100 Punkte gibt.
    const a = anfrage({ bezug: "sofort" })
    const o = objekt({ verfuegbarAb: new Date() })
    const match = berechneMatch(a, o)
    expect(match).not.toBeNull()
    expect(match!.score).toBe(100)
  })

  it("gewichtet Fläche 30%, Preis 25%, Lage 20%, Bezug 15%, Anforderungen 10%", () => {
    // Nur die Fläche weicht ab (auf 0 Punkte), alles andere ist perfekt.
    const a = anfrage({ flaecheMin: 180, flaecheMax: 260, ort: "Solothurn", budgetProM2: 250, bezug: null })
    const o = objekt({ flaeche: 5000, ort: "Solothurn", preisProM2: 250 })
    const match = berechneMatch(a, o)
    // 0*0.30 + 100*0.25 + 100*0.20 + 50*0.15 (bezug=null->50) + 100*0.10 = 62.5 -> 63
    expect(match!.score).toBe(63)
  })

  it("füllt die Kriterien-Tabelle mit gesucht/angeboten/status je Zeile", () => {
    const match = berechneMatch(anfrage(), objekt())
    expect(match!.kriterien).toContainEqual(
      expect.objectContaining({ kriterium: "Fläche", status: "ok" })
    )
  })

  it("setzt den Hinweis auf den schwächsten Punkt", () => {
    const a = anfrage({ budgetProM2: 200 })
    const o = objekt({ preisProM2: 400, flaeche: 240, ort: "Solothurn" })
    const match = berechneMatch(a, o)
    expect(match!.hinweis.toLowerCase()).toContain("preis")
  })

  it("liefert null bei durchgehend schwachen Werten in allen Kriterien", () => {
    const a = anfrage({ flaecheMin: 9000, flaecheMax: 9500, budgetProM2: 10, ort: "Bettlach", bezug: "sofort" })
    const o = objekt({ flaeche: 100, preisProM2: 900, ort: "Zuchwil", verfuegbarAb: new Date(Date.now() + 200 * 86_400_000) })
    expect(berechneMatch(a, o)).toBeNull()
  })

  it("lässt einen Score von genau 60 zu (Ausschluss gilt nur unter 60)", () => {
    // Jedes Einzelkriterium liefert exakt 60 Punkte, damit auch der gewichtete
    // Gesamtscore unabhängig von der Gewichtsverteilung bei genau 60 landet:
    // Fläche 40% über der Obergrenze (260→364), Preis 32% über Budget,
    // Lage gleiche Region/anderer Ort, Bezug 21 Tage Abweichung, 3 von 5
    // Anforderungen erfüllt.
    const a = anfrage({
      flaecheMin: null, flaecheMax: 260, ort: "Wasseramt", budgetProM2: 200, bezug: "sofort",
      anforderungen: { r1: true, r2: true, r3: true, r4: true, r5: true },
    })
    const o = objekt({
      flaeche: 364, ort: "Zuchwil", preisProM2: 264,
      verfuegbarAb: new Date(Date.now() + 21 * 86_400_000),
      eigenschaften: { r1: true, r2: true, r3: true },
    })
    const match = berechneMatch(a, o)
    expect(match).not.toBeNull()
    expect(match!.score).toBe(60)
  })

  it("nennt bei mehreren schwachen Kriterien im selben Status das mit den wenigsten Punkten, nicht das erste in der Tabelle", () => {
    // Fläche (45 Punkte) und Preis (5 Punkte) liegen beide im "nein"-Bucket
    // (< 50), Preis ist aber der eindeutig schwächere Wert. Eine reine
    // Status-basierte Auswahl (ok=3/teilweise=2/nein=1) mit Array-Reihenfolge
    // als Tie-Breaker würde hier fälschlich "Fläche" nennen, nur weil es zuerst
    // in der Kriterien-Tabelle steht.
    const a = anfrage({
      flaecheMin: null, flaecheMax: 200, ort: "Solothurn", budgetProM2: 200, bezug: "sofort",
      anforderungen: {},
    })
    const o = objekt({
      flaeche: 310, // Fläche: 45 Punkte (55% über der Obergrenze)
      preisProM2: 319, // Preis: 5 Punkte (59.5% über Budget)
      ort: "Solothurn",
      verfuegbarAb: new Date(),
    })
    const match = berechneMatch(a, o)
    expect(match).not.toBeNull()
    expect(match!.hinweis.toLowerCase()).toContain("preis")
    expect(match!.hinweis.toLowerCase()).not.toContain("fläche")
  })
})
