import { describe, expect, it } from "vitest"
import { istReservierungAbgelaufen, RESERVIERUNG_TIMEOUT_MS } from "./entwurf-status"

describe("istReservierungAbgelaufen", () => {
  it("ist nicht abgelaufen, direkt nach der Reservierung", () => {
    const gesendetAm = new Date("2026-01-01T10:00:00.000Z").toISOString()
    const jetzt = new Date("2026-01-01T10:00:00.000Z")
    expect(istReservierungAbgelaufen(gesendetAm, jetzt)).toBe(false)
  })

  it("ist nicht abgelaufen, knapp unter zwei Minuten", () => {
    const gesendetAm = new Date("2026-01-01T10:00:00.000Z").toISOString()
    const jetzt = new Date(new Date(gesendetAm).getTime() + RESERVIERUNG_TIMEOUT_MS - 1)
    expect(istReservierungAbgelaufen(gesendetAm, jetzt)).toBe(false)
  })

  it("ist abgelaufen, genau nach zwei Minuten", () => {
    const gesendetAm = new Date("2026-01-01T10:00:00.000Z").toISOString()
    const jetzt = new Date(new Date(gesendetAm).getTime() + RESERVIERUNG_TIMEOUT_MS)
    expect(istReservierungAbgelaufen(gesendetAm, jetzt)).toBe(true)
  })

  it("ist abgelaufen, deutlich nach zwei Minuten", () => {
    const gesendetAm = new Date("2026-01-01T10:00:00.000Z").toISOString()
    const jetzt = new Date("2026-01-01T10:05:00.000Z")
    expect(istReservierungAbgelaufen(gesendetAm, jetzt)).toBe(true)
  })
})
