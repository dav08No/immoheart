import { describe, expect, it } from "vitest"
import { baueObjektanfrageEinfuegung, objektanfrageFelder, objektanfrageFirma } from "./anfrage-aus-objektanfrage"

const FELDER = {
  firma: "Muster AG",
  name: "Anna Muster",
  email: "Anna@Muster.ch",
  telefon: "+41 32 000 00 00",
  nachricht: "Wir möchten besichtigen.",
}

describe("objektanfrageFelder", () => {
  it("liest die Formularangaben", () => {
    expect(objektanfrageFelder(FELDER)).toEqual(FELDER)
  })
  it("fehlendes Telefon wird null", () => {
    const ohne = { firma: FELDER.firma, name: FELDER.name, email: FELDER.email, nachricht: FELDER.nachricht }
    expect(objektanfrageFelder(ohne)?.telefon).toBeNull()
  })
  it("liefert null für fremde oder unvollständige Formen", () => {
    expect(objektanfrageFelder(null)).toBeNull()
    expect(objektanfrageFelder({ ort: "Solothurn" })).toBeNull()
    expect(objektanfrageFelder([FELDER])).toBeNull()
  })
})

describe("objektanfrageFirma", () => {
  it("übernimmt Firma, Kontaktname und kleingeschriebene E-Mail", () => {
    expect(objektanfrageFirma(FELDER)).toEqual({
      name: "Muster AG",
      kontakt_name: "Anna Muster",
      kontakt_email: "anna@muster.ch",
    })
  })
  it("fällt ohne Firmenname auf die E-Mail zurück", () => {
    expect(objektanfrageFirma({ ...FELDER, firma: " ", name: "" })).toEqual({
      name: "Anna@Muster.ch",
      kontakt_name: null,
      kontakt_email: "anna@muster.ch",
    })
  })
})

describe("baueObjektanfrageEinfuegung", () => {
  it("leitet Ort, Nutzung und Fläche aus dem Objekt ab", () => {
    const objekt = { id: "objekt-1", ort: "Solothurn", nutzung: "lager", flaeche: 450 } as const
    expect(baueObjektanfrageEinfuegung(objekt, "firma-1")).toEqual({
      ort: "Solothurn",
      nutzung: "lager",
      flaeche_min: 450,
      flaeche_max: 450,
      firma_id: "firma-1",
      quelle: "website",
      objekt_id: "objekt-1",
    })
  })
})
