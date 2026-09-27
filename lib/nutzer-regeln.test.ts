import { describe, expect, it } from "vitest"
import { deaktivierenVerboten, kontoStatus, neuesKontoSchema, rechtEntzugVerboten } from "./nutzer-regeln"

describe("neuesKontoSchema", () => {
  it("normalisiert und akzeptiert gültige Eingaben", () => {
    const r = neuesKontoSchema.parse({ name: "  Anna  ", email: " Anna@Example.CH ", darfNutzerAnlegen: false })
    expect(r).toEqual({ name: "Anna", email: "anna@example.ch", darfNutzerAnlegen: false })
  })
  it("lehnt leere Namen und ungültige Adressen ab", () => {
    expect(neuesKontoSchema.safeParse({ name: " ", email: "a@b.ch", darfNutzerAnlegen: true }).success).toBe(false)
    expect(neuesKontoSchema.safeParse({ name: "A", email: "kein-mail", darfNutzerAnlegen: true }).success).toBe(false)
    expect(neuesKontoSchema.safeParse({ name: "x".repeat(81), email: "a@b.ch", darfNutzerAnlegen: true }).success).toBe(false)
  })
})

describe("kontoStatus", () => {
  it("unterscheidet deaktiviert, eingeladen und aktiv", () => {
    expect(kontoStatus(false, "2026-09-01T00:00:00Z")).toBe("deaktiviert")
    expect(kontoStatus(true, null)).toBe("eingeladen")
    expect(kontoStatus(true, "2026-09-01T00:00:00Z")).toBe("aktiv")
  })
})

describe("deaktivierenVerboten", () => {
  it("verbietet das eigene Konto", () => {
    expect(deaktivierenVerboten({ zielUserId: "a", eigeneUserId: "a", zielHatRecht: false, aktiveMitRecht: 3 })).toBe(
      "Das eigene Konto kann nicht deaktiviert werden."
    )
  })
  it("verbietet das letzte aktive Konto mit Recht", () => {
    expect(deaktivierenVerboten({ zielUserId: "b", eigeneUserId: "a", zielHatRecht: true, aktiveMitRecht: 1 })).toBe(
      "Das letzte Konto mit Recht zur Nutzerverwaltung kann nicht deaktiviert werden."
    )
  })
  it("erlaubt sonst", () => {
    expect(deaktivierenVerboten({ zielUserId: "b", eigeneUserId: "a", zielHatRecht: true, aktiveMitRecht: 2 })).toBeNull()
    expect(deaktivierenVerboten({ zielUserId: "b", eigeneUserId: "a", zielHatRecht: false, aktiveMitRecht: 1 })).toBeNull()
  })
})

describe("rechtEntzugVerboten", () => {
  it("verbietet, sich selbst das Recht zu entziehen", () => {
    expect(rechtEntzugVerboten({ zielUserId: "a", eigeneUserId: "a", aktiveMitRecht: 3, zielIstAktiv: true })).toBe(
      "Das eigene Recht kann nicht entzogen werden."
    )
  })
  it("verbietet, dem letzten aktiven Konto das Recht zu entziehen", () => {
    expect(rechtEntzugVerboten({ zielUserId: "b", eigeneUserId: "a", aktiveMitRecht: 1, zielIstAktiv: true })).toBe(
      "Das letzte Konto mit Recht zur Nutzerverwaltung behält das Recht."
    )
  })
  it("erlaubt bei inaktivem Ziel oder mehreren", () => {
    expect(rechtEntzugVerboten({ zielUserId: "b", eigeneUserId: "a", aktiveMitRecht: 1, zielIstAktiv: false })).toBeNull()
    expect(rechtEntzugVerboten({ zielUserId: "b", eigeneUserId: "a", aktiveMitRecht: 2, zielIstAktiv: true })).toBeNull()
  })
})
