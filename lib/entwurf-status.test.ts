import { describe, expect, it } from "vitest"
import { istReservierungAbgelaufen, RESERVIERUNG_TIMEOUT_MS, angebotGesperrt } from "./entwurf-status"

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

describe("angebotGesperrt", () => {
  const angebot = { typ: "angebot", match_id: "m1" }

  it("lässt ein Angebot mit offenem Treffer auf verfügbarem Objekt durch", () => {
    expect(angebotGesperrt(angebot, "neu", "verfuegbar")).toBe(false)
    expect(angebotGesperrt(angebot, "gesendet", "verfuegbar")).toBe(false)
  })

  it("sperrt Angebote ohne Treffer", () => {
    expect(angebotGesperrt({ typ: "angebot", match_id: null }, null, null)).toBe(true)
  })

  it("sperrt Angebote mit abgeschlossenem Treffer, auch wenn das Objekt verfügbar ist", () => {
    for (const status of ["erledigt", "abgelehnt", "verworfen", "vermittelt", "reserviert"] as const) {
      expect(angebotGesperrt(angebot, status, "verfuegbar")).toBe(true)
    }
  })

  it("sperrt Angebote für reservierte oder vermietete Objekte (Live-Befund L1)", () => {
    expect(angebotGesperrt(angebot, "neu", "reserviert")).toBe(true)
    expect(angebotGesperrt(angebot, "erledigt", "vermietet")).toBe(true)
    expect(angebotGesperrt(angebot, "neu", null)).toBe(true)
  })

  it("betrifft nur Angebote, keine anderen Typen", () => {
    expect(angebotGesperrt({ typ: "nachfass", match_id: null }, null, null)).toBe(false)
    expect(angebotGesperrt({ typ: "absage", match_id: "m1" }, "erledigt", "vermietet")).toBe(false)
  })
})
