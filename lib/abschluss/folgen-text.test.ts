import { describe, expect, it } from "vitest"
import { folgenText, sichtbareAktionen } from "./folgen-text"

describe("folgenText", () => {
  it("Reservieren zählt die weiteren Angebote; Absagen erst beim Vertrag", () => {
    expect(folgenText("reservieren", 2)).toBe(
      "2 weitere Angebote zu diesem Objekt – Absagen erst bei Vertragsabschluss"
    )
    expect(folgenText("reservieren", 1)).toBe("1 weiteres Angebot zu diesem Objekt – Absage erst bei Vertragsabschluss")
  })

  it("Vermitteln nennt die Zahl der Absage-Entwürfe, nicht der Firmen", () => {
    expect(folgenText("vermitteln", 3)).toBe("3 Absage-Entwürfe werden erstellt")
    expect(folgenText("vermitteln", 1)).toBe("1 Absage-Entwurf wird erstellt")
  })

  it("ohne weitere Angebote ein schlichter Satz ohne Zahl", () => {
    expect(folgenText("reservieren", 0)).toBe("Keine weiteren Angebote zu diesem Objekt")
    expect(folgenText("vermitteln", 0)).toBe("Keine weiteren Angebote – es entstehen keine Absagen")
  })

  it("Aufheben und Ablehnen haben kurze Folgesätze unabhängig von der Zahl", () => {
    expect(folgenText("aufheben", 0)).toBe("Das Objekt wird wieder verfügbar, die anderen Angebote bleiben bestehen")
    expect(folgenText("aufheben", 4)).toBe(folgenText("aufheben", 0))
    expect(folgenText("ablehnen", 2)).toBe("Der Treffer wird als abgelehnt markiert, es entsteht keine Mail")
  })
})

describe("sichtbareAktionen", () => {
  it("offene Anfrage: Nebenaktion zuerst, Primäraktion zuletzt (rechts)", () => {
    expect(sichtbareAktionen("gesendet", "verfuegbar", "offen")).toEqual(["ablehnen", "reservieren"])
    expect(sichtbareAktionen("reserviert", "reserviert", "offen")).toEqual(["aufheben", "vermitteln"])
  })

  it("vermittelte Anfrage: ein noch reservierter Treffer kann nur aufgehoben werden (R6/R9)", () => {
    expect(sichtbareAktionen("reserviert", "reserviert", "vermittelt")).toEqual(["aufheben"])
  })

  it("vermittelte Anfrage: ein angebotener Treffer kann nur noch abgelehnt werden (R10)", () => {
    expect(sichtbareAktionen("gesendet", "verfuegbar", "vermittelt")).toEqual(["ablehnen"])
    expect(sichtbareAktionen("gesendet", "reserviert", "vermittelt")).toEqual(["ablehnen"])
  })

  it("abgeschlossene Treffer haben keine Aktionen", () => {
    expect(sichtbareAktionen("vermittelt", "vermietet", "vermittelt")).toEqual([])
    expect(sichtbareAktionen("erledigt", "vermietet", "offen")).toEqual([])
  })
})
