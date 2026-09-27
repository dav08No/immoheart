import { describe, expect, it } from "vitest"
import { erstelleAbrufTakt, sollJetztAbrufen } from "./mail-abruf-timing"

describe("sollJetztAbrufen", () => {
  it("laeuft beim allerersten Mal (letzterLauf 0) sofort, wenn sichtbar", () => {
    expect(sollJetztAbrufen({ letzterLauf: 0, jetzt: Date.now(), sichtbar: true, intervallMs: 120_000 })).toBe(true)
  })

  it("laeuft nie, wenn der Tab nicht sichtbar ist -- egal wie viel Zeit vergangen ist", () => {
    expect(sollJetztAbrufen({ letzterLauf: 0, jetzt: 999_999_999, sichtbar: false, intervallMs: 120_000 })).toBe(false)
  })

  it("laeuft nicht, solange das Intervall seit dem letzten Lauf noch nicht um ist", () => {
    expect(sollJetztAbrufen({ letzterLauf: 100_000, jetzt: 219_999, sichtbar: true, intervallMs: 120_000 })).toBe(false)
  })

  it("laeuft wieder, sobald das Intervall genau erreicht ist", () => {
    expect(sollJetztAbrufen({ letzterLauf: 100_000, jetzt: 220_000, sichtbar: true, intervallMs: 120_000 })).toBe(true)
  })

  it("laeuft, wenn seit dem letzten Lauf deutlich mehr Zeit vergangen ist", () => {
    expect(sollJetztAbrufen({ letzterLauf: 100_000, jetzt: 500_000, sichtbar: true, intervallMs: 120_000 })).toBe(true)
  })
})

describe("erstelleAbrufTakt", () => {
  function aufbau(rundeLief: () => boolean, dauerMs = 0) {
    // Echte Uhr startet weit weg von 0 (letzterLauf beginnt bei 0).
    const basis = 1_000_000
    let jetzt = basis
    const starts: number[] = []
    const takt = erstelleAbrufTakt({
      intervallMs: 120_000,
      jetzt: () => jetzt,
      sichtbar: () => true,
      runde: async () => {
        starts.push(jetzt - basis)
        jetzt += dauerMs
        return rundeLief()
      },
    })
    // Simuliert einen 15-s-Takt über die angegebene Dauer.
    async function laufeBis(ende: number) {
      while (jetzt - basis <= ende) {
        await takt()
        jetzt = basis + Math.ceil((jetzt - basis + 1) / 15_000) * 15_000
      }
    }
    return { starts, laufeBis }
  }

  it("startet alle 120 s, auch wenn eine Runde selbst Zeit braucht", async () => {
    const { starts, laufeBis } = aufbau(() => true, 5_000)
    await laufeBis(360_000)
    expect(starts).toEqual([0, 120_000, 240_000, 360_000])
  })

  it("versucht es im nächsten Takt erneut, wenn die Runde nicht lief", async () => {
    let versuche = 0
    const { starts, laufeBis } = aufbau(() => ++versuche > 1)
    await laufeBis(30_000)
    expect(starts).toEqual([0, 15_000])
  })
})
