import { describe, expect, it } from "vitest"
import { sollJetztAbrufen } from "./mail-abruf-timing"

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
