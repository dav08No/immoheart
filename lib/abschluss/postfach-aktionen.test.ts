import { describe, expect, it } from "vitest"
import { abgelehnterTreffer, meldungAus, meldungsAktion } from "./postfach-aktionen"

describe("meldungAus", () => {
  it("liest Änderung und Zusammenfassung", () => {
    expect(meldungAus({ meldung: { aenderung: "nicht_verfuegbar", zusammenfassung: "Vermietet." } })).toEqual({
      aenderung: "nicht_verfuegbar",
      zusammenfassung: "Vermietet.",
    })
  })

  it("unbekannte oder fehlende Werte gelten als sonstige Änderung ohne Text", () => {
    expect(meldungAus({ meldung: { aenderung: "quatsch" } })).toEqual({ aenderung: "sonstige_aenderung", zusammenfassung: "" })
    expect(meldungAus({ meldung: null })).toEqual({ aenderung: "sonstige_aenderung", zusammenfassung: "" })
    expect(meldungAus(null)).toEqual({ aenderung: "sonstige_aenderung", zusammenfassung: "" })
    expect(meldungAus([1, 2])).toEqual({ aenderung: "sonstige_aenderung", zusammenfassung: "" })
  })
})

describe("meldungsAktion", () => {
  it("nicht verfügbar nur, solange das Objekt verfügbar oder reserviert ist", () => {
    expect(meldungsAktion("nicht_verfuegbar", "verfuegbar")).toBe("nicht_verfuegbar")
    expect(meldungsAktion("nicht_verfuegbar", "reserviert")).toBe("nicht_verfuegbar")
    expect(meldungsAktion("nicht_verfuegbar", "vermietet")).toBeNull()
  })

  it("wieder verfügbar nur bei reserviertem oder vermietetem Objekt", () => {
    expect(meldungsAktion("wieder_verfuegbar", "reserviert")).toBe("wieder_verfuegbar")
    expect(meldungsAktion("wieder_verfuegbar", "vermietet")).toBe("wieder_verfuegbar")
    expect(meldungsAktion("wieder_verfuegbar", "verfuegbar")).toBeNull()
  })

  it("sonstige Änderung hat keine Statusaktion", () => {
    expect(meldungsAktion("sonstige_aenderung", "verfuegbar")).toBeNull()
  })
})

describe("abgelehnterTreffer", () => {
  it("liefert die Treffer-ID nur bei kein_interesse und gesetzter match_id", () => {
    expect(abgelehnterTreffer({ kein_interesse: true, match_id: "m1" })).toBe("m1")
    expect(abgelehnterTreffer({ kein_interesse: false, match_id: "m1" })).toBeNull()
    expect(abgelehnterTreffer({ kein_interesse: true, match_id: null })).toBeNull()
    expect(abgelehnterTreffer({ kein_interesse: "ja", match_id: "m1" })).toBeNull()
    expect(abgelehnterTreffer(null)).toBeNull()
  })
})
