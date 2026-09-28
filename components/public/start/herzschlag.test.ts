import { describe, expect, it } from "vitest"
import { herzschlagSkala, HERZSCHLAG_DAUER } from "./herzschlag"

// Spiegelt die CSS-Keyframes `herzschlag` in app/globals.css.
describe("herzschlagSkala", () => {
  it("dauert 1,2 s", () => {
    expect(HERZSCHLAG_DAUER).toBe(1.2)
  })

  it("trifft die Keyframes (Doppelschlag)", () => {
    expect(herzschlagSkala(0)).toBeCloseTo(1)
    expect(herzschlagSkala(0.12)).toBeCloseTo(1.18)
    expect(herzschlagSkala(0.24)).toBeCloseTo(1)
    expect(herzschlagSkala(0.36)).toBeCloseTo(1.12)
    expect(herzschlagSkala(0.48)).toBeCloseTo(1)
    expect(herzschlagSkala(0.9)).toBeCloseTo(1)
  })

  it("wiederholt sich alle 1,2 s", () => {
    expect(herzschlagSkala(1.32)).toBeCloseTo(1.18)
    expect(herzschlagSkala(12.36)).toBeCloseTo(1.12)
  })

  it("bleibt zwischen den Keyframes im Bereich 1 bis 1,18", () => {
    for (let t = 0; t < 1.2; t += 0.01) {
      const s = herzschlagSkala(t)
      expect(s).toBeGreaterThanOrEqual(1)
      expect(s).toBeLessThanOrEqual(1.18)
    }
  })
})
