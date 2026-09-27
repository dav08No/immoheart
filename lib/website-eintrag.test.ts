import { describe, expect, it } from "vitest"
import { objektanfrageEntwurf, objektanfrageNachricht, objektanfrageSchema } from "./website-eintrag"

const GUELTIG = {
  firma: "  Muster AG  ",
  name: "  Anna Muster  ",
  email: "  ANNA@Muster.ch ",
  telefon: " +41 32 123 45 67 ",
  nachricht: "  Wir interessieren uns für dieses Objekt.  ",
  objektId: "550e8400-e29b-41d4-a716-446655440000",
}

describe("objektanfrageSchema", () => {
  it("akzeptiert eine gültige Anfrage und trimmt alle Strings", () => {
    const ergebnis = objektanfrageSchema.parse(GUELTIG)
    expect(ergebnis.firma).toBe("Muster AG")
    expect(ergebnis.name).toBe("Anna Muster")
    expect(ergebnis.email).toBe("anna@muster.ch")
    expect(ergebnis.telefon).toBe("+41 32 123 45 67")
    expect(ergebnis.nachricht).toBe("Wir interessieren uns für dieses Objekt.")
  })

  it("erlaubt eine Anfrage ohne Telefon", () => {
    const ohneTelefon = { ...GUELTIG, telefon: undefined }
    expect(objektanfrageSchema.safeParse(ohneTelefon).success).toBe(true)
  })

  it("lehnt eine ungültige E-Mail ab", () => {
    expect(objektanfrageSchema.safeParse({ ...GUELTIG, email: "keine-email" }).success).toBe(false)
  })

  it("lehnt eine zu lange Nachricht ab", () => {
    expect(objektanfrageSchema.safeParse({ ...GUELTIG, nachricht: "x".repeat(2001) }).success).toBe(false)
  })

  it("lehnt ein Telefon mit Buchstaben ab", () => {
    expect(objektanfrageSchema.safeParse({ ...GUELTIG, telefon: "0041abc123" }).success).toBe(false)
  })

  it("lehnt eine leere Firma/Name/Nachricht ab", () => {
    expect(objektanfrageSchema.safeParse({ ...GUELTIG, firma: "  " }).success).toBe(false)
    expect(objektanfrageSchema.safeParse({ ...GUELTIG, name: "" }).success).toBe(false)
    expect(objektanfrageSchema.safeParse({ ...GUELTIG, nachricht: "" }).success).toBe(false)
  })

  it("lehnt eine ungültige objektId ab", () => {
    expect(objektanfrageSchema.safeParse({ ...GUELTIG, objektId: "keine-uuid" }).success).toBe(false)
  })
})

describe("objektanfrageNachricht", () => {
  const a = objektanfrageSchema.parse(GUELTIG)
  const n = objektanfrageNachricht(a, "Bürofläche Solothurn", "kontakt@immoheart.ch")

  it("setzt die festen Felder", () => {
    expect(n.richtung).toBe("eingang")
    expect(n.typ).toBe("anfrage")
    expect(n.quelle).toBe("website")
    expect(n.kategorie).toBe("objektanfrage")
    expect(n.ki_status).toBe("fertig")
    expect(n.gelesen).toBe(false)
    expect(n.von).toBe("anna@muster.ch")
    expect(n.an).toBe("kontakt@immoheart.ch")
    expect(n.betreff).toBe("Objektanfrage: Bürofläche Solothurn")
    expect(n.objekt_id).toBe(a.objektId)
  })

  it("body enthält alle Felder als reinen Text", () => {
    expect(n.body).toContain("Muster AG")
    expect(n.body).toContain("Anna Muster")
    expect(n.body).toContain("anna@muster.ch")
    expect(n.body).toContain("+41 32 123 45 67")
    expect(n.body).toContain("Wir interessieren uns für dieses Objekt.")
    expect(n.body).not.toMatch(/<[^>]+>/)
  })

  it("erkannte_felder enthält alle Werte", () => {
    expect(n.erkannte_felder).toEqual({
      firma: "Muster AG",
      name: "Anna Muster",
      email: "anna@muster.ch",
      telefon: "+41 32 123 45 67",
      nachricht: "Wir interessieren uns für dieses Objekt.",
    })
  })
})

describe("objektanfrageEntwurf", () => {
  const a = objektanfrageSchema.parse(GUELTIG)
  const entwurf = objektanfrageEntwurf(a, "Bürofläche Solothurn")

  it("enthält Name und Titel ohne Platzhalter", () => {
    expect(entwurf.body).toContain("Anna Muster")
    expect(entwurf.body).toContain("Bürofläche Solothurn")
    expect(entwurf.body).not.toContain("{")
    expect(entwurf.betreff).not.toContain("{")
  })

  it("hat den Betreff Re: Objektanfrage: <Titel>", () => {
    expect(entwurf.betreff).toBe("Re: Objektanfrage: Bürofläche Solothurn")
  })

  it("enthält die Signatur", () => {
    expect(entwurf.body).toContain("Freundliche Grüsse")
    expect(entwurf.body).toContain("immoheart")
  })
})
