import { describe, expect, it } from "vitest"
import { puls, pulsDauerMs, pulsFarbe } from "./puls"

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
  it("rechnet mit explizit übergebenem jetzt statt Date.now() (testbar, keine Systemzeit-Abhängigkeit)", () => {
    const letzterKontakt = new Date("2026-09-01T00:00:00Z")
    expect(puls(letzterKontakt, new Date("2026-09-11T00:00:00Z"))).toBe(90)
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

describe("pulsDauerMs", () => {
  it("schlägt ruhig (3s) bei vollem, gesundem Puls", () => {
    expect(pulsDauerMs(100)).toBe(3000)
  })
  it("schlägt schnell (1.2s) bei Puls 0", () => {
    expect(pulsDauerMs(0)).toBe(1200)
  })
  it("liegt in der Mitte bei Puls 50", () => {
    expect(pulsDauerMs(50)).toBe(2100)
  })
  it("klemmt Werte über 100 auf das gesunde Tempo", () => {
    expect(pulsDauerMs(140)).toBe(3000)
  })
  it("klemmt negative Werte auf das kritische Tempo", () => {
    expect(pulsDauerMs(-10)).toBe(1200)
  })
})
