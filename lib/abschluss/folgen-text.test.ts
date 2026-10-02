import { describe, expect, it } from "vitest"
import { folgenText, sichtbareAktionen } from "./folgen-text"

describe("folgenText", () => {
  it("Reservieren nennt die anderen Firmen und dass die Absage erst beim Vertrag kommt", () => {
    expect(folgenText("reservieren", 2)).toBe(
      "2 andere Firmen haben ein Angebot – sie erhalten erst bei Vertragsabschluss eine Absage"
    )
    expect(folgenText("reservieren", 1)).toBe(
      "1 andere Firma hat ein Angebot – sie erhält erst bei Vertragsabschluss eine Absage"
    )
  })

  it("Vermitteln nennt die Zahl der Absage-Entwürfe", () => {
    expect(folgenText("vermitteln", 3)).toBe("3 andere Firmen erhalten einen Absage-Entwurf")
    expect(folgenText("vermitteln", 1)).toBe("1 andere Firma erhält einen Absage-Entwurf")
  })

  it("ohne andere Angebote ein schlichter Bestätigungssatz ohne Zahl", () => {
    expect(folgenText("reservieren", 0)).toBe("Keine andere Firma hat ein Angebot für dieses Objekt")
    expect(folgenText("vermitteln", 0)).toBe("Keine andere Firma hat ein Angebot – es entstehen keine Absagen")
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
