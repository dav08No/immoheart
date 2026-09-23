import { describe, expect, it } from "vitest"
import { puls, pulsFarbe } from "./puls"

function vorTagen(tage: number): Date {
  return new Date(Date.now() - tage * 86_400_000)
}

describe("puls", () => {
  it("liefert 100 bei Kontakt heute", () => {
    expect(puls(vorTagen(0))).toBe(100)
  })
  it("sinkt um 1 pro Tag", () => {
    expect(puls(vorTagen(10))).toBe(90)
  })
  it("hat eine Untergrenze von 4", () => {
    expect(puls(vorTagen(500))).toBe(4)
  })
})

describe("pulsFarbe", () => {
  it("ist gut ab 60", () => {
    expect(pulsFarbe(60)).toBe("gut")
    expect(pulsFarbe(100)).toBe("gut")
  })
  it("ist warn zwischen 25 und 59", () => {
    expect(pulsFarbe(25)).toBe("warn")
    expect(pulsFarbe(59)).toBe("warn")
  })
  it("ist kritisch unter 25", () => {
    expect(pulsFarbe(24)).toBe("kritisch")
    expect(pulsFarbe(4)).toBe("kritisch")
  })
})
