import { describe, expect, it } from "vitest"
import { IMMOHEART_MAIL, INSERIEREN_VORLAGE, SUCHAUFTRAG_VORLAGE, mailtoLink } from "./mailto"

describe("mailtoLink", () => {
  it("baut einen mailto-Link an immoheart", () => {
    expect(mailtoLink("Hallo", "Text")).toBe(`mailto:${IMMOHEART_MAIL}?subject=Hallo&body=Text`)
  })

  it("kodiert Umlaute, &, ?, # und Zeilenumbrüche", () => {
    const link = mailtoLink("Büro & Lager?", "Zeile 1\nZeile #2\r\nÄnde")
    expect(link).toBe(
      `mailto:${IMMOHEART_MAIL}?subject=B%C3%BCro%20%26%20Lager%3F&body=Zeile%201%0AZeile%20%232%0A%C3%84nde`
    )
    // Nur die zwei eigenen Trenner dürfen roh im Link stehen.
    expect(link.split("?")).toHaveLength(2)
    expect(link.split("&")).toHaveLength(2)
    expect(link).not.toContain("#")
  })
})

describe("Vorlagen", () => {
  it("Suchauftrag fragt alle Suchkriterien ab", () => {
    for (const feld of ["Firma", "Branche", "Nutzung", "Ort", "Fläche", "Budget", "Bezug"]) {
      expect(SUCHAUFTRAG_VORLAGE.text).toContain(feld)
    }
    expect(SUCHAUFTRAG_VORLAGE.betreff).toBeTruthy()
  })

  it("Inserieren fragt Objektangaben ab und bittet um Fotos als Anhang", () => {
    for (const feld of ["Adresse", "Fläche", "Preis", "Nutzung", "Verfügbar"]) {
      expect(INSERIEREN_VORLAGE.text).toContain(feld)
    }
    expect(INSERIEREN_VORLAGE.text).toContain("Bitte Fotos als Anhang mitsenden")
    expect(INSERIEREN_VORLAGE.betreff).toBeTruthy()
  })
})
