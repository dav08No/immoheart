import { describe, expect, it } from "vitest"
import { ABSAGE_GESPERRT, ANGEBOT_GESPERRT, entwurfGesperrt, istReservierungAbgelaufen, RESERVIERUNG_TIMEOUT_MS } from "./entwurf-status"

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

describe("entwurfGesperrt -- Angebote", () => {
  const angebotGesperrt = (...a: Parameters<typeof entwurfGesperrt>) => entwurfGesperrt(...a) !== null
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

  it("liefert Chip und Meldung für gesperrte Angebote", () => {
    expect(entwurfGesperrt(angebot, "erledigt", "vermietet")).toEqual({ chip: "Angebot entfallen", meldung: ANGEBOT_GESPERRT })
  })
})

describe("entwurfGesperrt -- Absagen (Ruling R17)", () => {
  const absage = { typ: "absage", match_id: "m1" }

  it("lässt eine Absage durch, solange der Treffer erledigt ist", () => {
    expect(entwurfGesperrt(absage, "erledigt", "vermietet")).toBeNull()
    expect(entwurfGesperrt(absage, "erledigt", "verfuegbar")).toBeNull()
  })

  it("sperrt eine Absage, wenn der Treffer nach wieder verfügbar neu ist", () => {
    expect(entwurfGesperrt(absage, "neu", "verfuegbar")).toEqual({ chip: "Absage entfallen", meldung: ABSAGE_GESPERRT })
    expect(entwurfGesperrt(absage, "gesendet", "verfuegbar")).not.toBeNull()
    expect(entwurfGesperrt(absage, null, null)).not.toBeNull()
  })

  it("sperrt Absagen ohne Treffer nicht", () => {
    expect(entwurfGesperrt({ typ: "absage", match_id: null }, null, null)).toBeNull()
  })
})
