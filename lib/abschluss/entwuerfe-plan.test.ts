import { describe, expect, it } from "vitest"
import { abschlussMarker, planeEntwuerfe, zuFuellendePlatzhalter, istPlatzhalter } from "./entwuerfe-plan"

const objekt = { id: "o1", titel: "Büro Altstadt", eigentuemer_email: "eigner@example.ch" }
const treffer = { id: "m1", firmaEmail: "haupt@firma.ch", firma: "Haupt AG" }
const erledigtC = { id: "m3", firmaEmail: "c@firma.ch", firma: "C AG" }
const zweiErledigte = [{ id: "m2", firmaEmail: "b@firma.ch", firma: "B AG" }, erledigtC]

describe("planeEntwuerfe", () => {
  it("Reservieren erzeugt nur die Eigentümer-Info, keine Absage", () => {
    const { geplant, hinweise } = planeEntwuerfe({ aktion: "reservieren", objekt, treffer, erledigte: zweiErledigte })
    expect(geplant).toEqual([
      { typ: "eigentuemer_info", an: "eigner@example.ch", match_id: "m1", objekt_id: "o1", anlass: "reserviert" },
    ])
    expect(hinweise).toEqual([])
  })

  it("Vermitteln mit 2 erledigten → 2 Absagen + Eigentümer + Bestätigung", () => {
    const { geplant } = planeEntwuerfe({ aktion: "vermitteln", objekt, treffer, erledigte: zweiErledigte })
    expect(geplant).toEqual([
      { typ: "absage", an: "b@firma.ch", match_id: "m2", objekt_id: "o1" },
      { typ: "absage", an: "c@firma.ch", match_id: "m3", objekt_id: "o1" },
      { typ: "eigentuemer_info", an: "eigner@example.ch", match_id: "m1", objekt_id: "o1", anlass: "vermietet" },
      { typ: "bestaetigung", an: "haupt@firma.ch", match_id: "m1", objekt_id: "o1" },
    ])
  })

  it("Aufheben informiert nur den Eigentümer (aufgehoben)", () => {
    const { geplant } = planeEntwuerfe({ aktion: "aufheben", objekt, treffer, erledigte: [] })
    expect(geplant).toEqual([
      { typ: "eigentuemer_info", an: "eigner@example.ch", match_id: "m1", objekt_id: "o1", anlass: "aufgehoben" },
    ])
  })

  it("nicht_verfuegbar: nur Absagen je erledigtem Treffer", () => {
    const { geplant } = planeEntwuerfe({ aktion: "nicht_verfuegbar", objekt, treffer: null, erledigte: zweiErledigte })
    expect(geplant.map((g) => [g.typ, g.match_id])).toEqual([
      ["absage", "m2"],
      ["absage", "m3"],
    ])
  })

  it("fehlende Adressen → Hinweise statt Einträge", () => {
    const { geplant, hinweise } = planeEntwuerfe({
      aktion: "vermitteln",
      objekt: { ...objekt, eigentuemer_email: null },
      treffer: { id: "m1", firmaEmail: null, firma: "Haupt AG" },
      erledigte: [{ id: "m2", firmaEmail: "  ", firma: "B AG" }, erledigtC],
    })
    expect(geplant).toEqual([{ typ: "absage", an: "c@firma.ch", match_id: "m3", objekt_id: "o1" }])
    expect(hinweise).toEqual([
      "B AG hat keine E-Mail – keine Absage möglich",
      "Eigentümer-E-Mail fehlt – keine Info-Mail möglich",
      "Haupt AG hat keine E-Mail – keine Bestätigung möglich",
    ])
  })

  it("nutzt einen neutralen Namen, wenn die Firma unbekannt ist", () => {
    const { hinweise } = planeEntwuerfe({
      aktion: "nicht_verfuegbar",
      objekt,
      treffer: null,
      erledigte: [{ id: "m2", firmaEmail: null }],
    })
    expect(hinweise).toEqual(["Eine Firma hat keine E-Mail – keine Absage möglich"])
  })
})

const platzhalter = {
  id: "n1",
  typ: "absage" as const,
  richtung: "entwurf" as const,
  body: "",
  geloescht_am: null,
  gesendet_am: null,
  erkannte_felder: { abschluss: { ki_ausstehend: true } },
}

describe("abschlussMarker", () => {
  it("liest ki_ausstehend und anlass defensiv aus jsonb", () => {
    expect(abschlussMarker({ abschluss: { ki_ausstehend: true, anlass: "vermietet" } })).toEqual({
      ki_ausstehend: true,
      anlass: "vermietet",
    })
    expect(abschlussMarker({ abschluss: { ki_ausstehend: false, anlass: "quatsch" } })).toEqual({ ki_ausstehend: false })
    expect(abschlussMarker(null)).toBeNull()
    expect(abschlussMarker({ ort: "Solothurn" })).toBeNull()
    expect(abschlussMarker({ abschluss: "ja" })).toBeNull()
  })
})

describe("zuFuellendePlatzhalter", () => {
  it("liefert nur offene Platzhalter, die noch auf die KI warten", () => {
    const zeilen = [
      platzhalter,
      { ...platzhalter, id: "fertig", body: "Text", erkannte_felder: { abschluss: { ki_ausstehend: false } } },
      { ...platzhalter, id: "geloescht", geloescht_am: "2026-09-29T10:00:00Z" },
      { ...platzhalter, id: "gesendet", richtung: "gesendet" as const },
      { ...platzhalter, id: "im-versand", gesendet_am: "2026-09-29T10:00:00Z" },
      { ...platzhalter, id: "fremd", typ: "angebot" as const },
      { ...platzhalter, id: "ohne-marker", erkannte_felder: null },
    ]
    expect(zuFuellendePlatzhalter(zeilen).map((z) => z.id)).toEqual(["n1"])
  })

  it("überschreibt keinen Text, den die Nutzerin schon selbst eingetragen hat", () => {
    expect(zuFuellendePlatzhalter([{ ...platzhalter, body: "Selbst geschrieben" }])).toEqual([])
  })

  it("erzeugt nie neue Einträge: zweimal nachholen ergibt dieselbe Menge", () => {
    const zeilen = [platzhalter, { ...platzhalter, id: "n2" }]
    expect(zuFuellendePlatzhalter(zeilen)).toHaveLength(2)
    expect(zuFuellendePlatzhalter(zuFuellendePlatzhalter(zeilen))).toHaveLength(2)
  })
})

describe("istPlatzhalter", () => {
  it("erkennt einen einzelnen Platzhalter wie das Nachholen", () => {
    expect(istPlatzhalter(platzhalter)).toBe(true)
    expect(istPlatzhalter({ ...platzhalter, body: "Text" })).toBe(false)
    expect(istPlatzhalter({ ...platzhalter, erkannte_felder: { abschluss: { ki_ausstehend: false } } })).toBe(false)
  })
})
