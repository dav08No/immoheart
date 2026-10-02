import { describe, expect, it } from "vitest"
import { OBJEKT_AKTION_LABEL, objektAktionen, objektFolgenText } from "./objekt-folgen"

describe("objektAktionen", () => {
  it("verfügbar: nur Nicht mehr verfügbar", () => {
    expect(objektAktionen("verfuegbar")).toEqual(["nicht_verfuegbar"])
  })

  it("reserviert: beide, vermietet: nur Wieder verfügbar (R11)", () => {
    expect(objektAktionen("reserviert")).toEqual(["wieder_verfuegbar", "nicht_verfuegbar"])
    expect(objektAktionen("vermietet")).toEqual(["wieder_verfuegbar"])
  })

  it("hat Beschriftungen für beide Aktionen", () => {
    expect(OBJEKT_AKTION_LABEL.nicht_verfuegbar).toBe("Nicht mehr verfügbar")
    expect(OBJEKT_AKTION_LABEL.wieder_verfuegbar).toBe("Wieder verfügbar setzen")
  })
})

describe("objektFolgenText", () => {
  it("Nicht mehr verfügbar nennt die Zahl der Absage-Entwürfe", () => {
    expect(objektFolgenText("nicht_verfuegbar", 3)).toBe(
      "Das Objekt wird als vermietet markiert. 3 Absage-Entwürfe werden erstellt"
    )
    expect(objektFolgenText("nicht_verfuegbar", 1)).toBe(
      "Das Objekt wird als vermietet markiert. 1 Absage-Entwurf wird erstellt"
    )
    expect(objektFolgenText("nicht_verfuegbar", 0)).toBe(
      "Das Objekt wird als vermietet markiert. Keine offenen Angebote – es entstehen keine Absagen"
    )
  })

  it("Wieder verfügbar hat einen kurzen Folgesatz unabhängig von der Zahl", () => {
    expect(objektFolgenText("wieder_verfuegbar", 0)).toBe(
      "Das Objekt wird wieder verfügbar und neu gematcht. Firmen mit früherer Absage und noch offener Suche erscheinen wieder als neue Treffer. Abgeschlossene Vermittlungen bleiben als Verlauf erhalten"
    )
    expect(objektFolgenText("wieder_verfuegbar", 5)).toBe(objektFolgenText("wieder_verfuegbar", 0))
  })
})
