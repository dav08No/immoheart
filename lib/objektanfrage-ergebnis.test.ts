import { describe, expect, it } from "vitest"
import { z } from "zod"
import { feldFehlerAus, limitErgebnis, zeitTokenErgebnis, zodFehlerErgebnis } from "./objektanfrage-ergebnis"
import { objektanfrageSchema } from "./website-eintrag"

describe("feldFehlerAus", () => {
  const schema = z.object({ email: z.email(), nachricht: z.string().min(1) })

  it("bildet je fehlerhaftem Feld genau einen Eintrag", () => {
    const geprueft = schema.safeParse({ email: "keine-email", nachricht: "" })
    expect(geprueft.success).toBe(false)
    if (geprueft.success) return
    const fehler = feldFehlerAus(geprueft.error)
    expect(Object.keys(fehler).sort()).toEqual(["email", "nachricht"])
    expect(fehler.email).toBeTruthy()
    expect(fehler.nachricht).toBeTruthy()
  })

  it("behält nur den ersten Fehler je Feld", () => {
    const mehrfach = z.object({ email: z.string().min(5).max(3) })
    const geprueft = mehrfach.safeParse({ email: "" })
    expect(geprueft.success).toBe(false)
    if (geprueft.success) return
    expect(Object.keys(feldFehlerAus(geprueft.error))).toEqual(["email"])
  })
})

describe("zeitTokenErgebnis", () => {
  it("ist null bei 'ok'", () => {
    expect(zeitTokenErgebnis("ok")).toBeNull()
  })

  it("meldet denselben Fehler bei 'zu_schnell' und 'ungueltig'", () => {
    const zuSchnell = zeitTokenErgebnis("zu_schnell")
    const ungueltig = zeitTokenErgebnis("ungueltig")
    expect(zuSchnell).toEqual({ ok: false, fehler: "Bitte versuchen Sie es in ein paar Sekunden erneut." })
    expect(ungueltig).toEqual(zuSchnell)
  })
})

const GUELTIGE_ANFRAGE = {
  firma: "Muster AG",
  name: "Anna Muster",
  email: "anna@muster.ch",
  nachricht: "Wir interessieren uns für dieses Objekt.",
  objektId: "550e8400-e29b-41d4-a716-446655440000",
}

describe("zodFehlerErgebnis", () => {
  it("liefert die deutsche E-Mail-Meldung im feldFehler", () => {
    const geprueft = objektanfrageSchema.safeParse({ ...GUELTIGE_ANFRAGE, email: "keine-email" })
    expect(geprueft.success).toBe(false)
    if (geprueft.success) return
    const ergebnis = zodFehlerErgebnis(geprueft.error)
    expect(ergebnis).toEqual({
      ok: false,
      fehler: "Bitte prüfen Sie Ihre Eingaben.",
      feldFehler: { email: "Bitte geben Sie eine gültige E-Mail-Adresse an." },
    })
  })

  it("meldet eine ungültige objektId als 'Objekt nicht mehr verfügbar', ohne feldFehler", () => {
    const geprueft = objektanfrageSchema.safeParse({ ...GUELTIGE_ANFRAGE, objektId: "keine-uuid" })
    expect(geprueft.success).toBe(false)
    if (geprueft.success) return
    expect(zodFehlerErgebnis(geprueft.error)).toEqual({ ok: false, fehler: "Dieses Objekt ist nicht mehr verfügbar." })
  })
})

describe("limitErgebnis", () => {
  it("ist null, solange die Anzahl das Limit nicht übersteigt", () => {
    expect(limitErgebnis(5, 5)).toBeNull()
    expect(limitErgebnis(0, 5)).toBeNull()
  })

  it("meldet den Fehler, sobald die Anzahl das Limit übersteigt", () => {
    expect(limitErgebnis(6, 5)).toEqual({ ok: false, fehler: "Zu viele Anfragen. Bitte später erneut versuchen." })
  })
})
