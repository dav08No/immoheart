import { describe, expect, it } from "vitest"
import {
  anfrageQuelle, baueAnfrageEinfuegung, feldUebernehmenAenderung, feldUnterscheidetSich, firmenName, suchanfrageKontakt,
  type AnfrageWerte,
} from "./anfrage-aus-eingang"
import type { ErkannteFelder } from "@/lib/ki/erkennung"

const LEERE_FELDER: ErkannteFelder = {
  firma: null,
  flaeche_min: null,
  flaeche_max: null,
  ort: null,
  budget_pro_m2: null,
  bezug: null,
  branche: null,
  nutzung: null,
}

describe("firmenName", () => {
  it("nimmt den von der KI erkannten Firmennamen", () => {
    expect(firmenName({ ...LEERE_FELDER, firma: "Muster AG" }, "info@muster.ch")).toBe("Muster AG")
  })

  it("fällt ohne erkannten Namen auf die Absenderadresse zurück", () => {
    expect(firmenName(LEERE_FELDER, "info@muster.ch")).toBe("info@muster.ch")
  })
})

describe("baueAnfrageEinfuegung", () => {
  it("übernimmt Felder, Nutzung und firma_id", () => {
    const felder: ErkannteFelder = {
      ...LEERE_FELDER,
      ort: "Solothurn",
      flaeche_min: 100,
      flaeche_max: 200,
      budget_pro_m2: 15,
      bezug: "sofort",
    }
    expect(baueAnfrageEinfuegung(felder, "buero", "firma-1", "mail")).toEqual({
      ort: "Solothurn",
      nutzung: "buero",
      flaeche_min: 100,
      flaeche_max: 200,
      budget_pro_m2: 15,
      bezug: "sofort",
      firma_id: "firma-1",
      quelle: "mail",
    })
  })

  it("übernimmt die Quelle website für Suchaufträge vom Formular", () => {
    expect(baueAnfrageEinfuegung(LEERE_FELDER, "lager", "firma-2", "website").quelle).toBe("website")
  })
})

describe("anfrageQuelle", () => {
  it("website bleibt website, alles andere gilt als Mail", () => {
    expect(anfrageQuelle("website")).toBe("website")
    expect(anfrageQuelle("mail")).toBe("mail")
    expect(anfrageQuelle(null)).toBe("mail")
  })
})

describe("suchanfrageKontakt", () => {
  it("liest die Kontaktangaben eines Website-Suchauftrags", () => {
    const felder = { ...LEERE_FELDER, kontakt: { name: "Anna", email: "a@b.ch", telefon: null, nachricht: "Hallo" } }
    expect(suchanfrageKontakt(felder)).toEqual({ name: "Anna", email: "a@b.ch", telefon: null, nachricht: "Hallo" })
  })

  it("liefert null ohne Kontakt (Mail-Eingang) oder bei kaputten Daten", () => {
    expect(suchanfrageKontakt(LEERE_FELDER)).toBeNull()
    expect(suchanfrageKontakt(null)).toBeNull()
    expect(suchanfrageKontakt({ kontakt: { name: 3 } })).toBeNull()
  })
})

describe("feldUebernehmenAenderung", () => {
  it("liefert null, wenn die KI für das Feld nichts erkannt hat", () => {
    expect(feldUebernehmenAenderung("ort", LEERE_FELDER)).toBeNull()
  })

  it("liefert die passende Teiländerung für jedes Feld der Whitelist", () => {
    const felder: ErkannteFelder = {
      ...LEERE_FELDER,
      flaeche_min: 100,
      flaeche_max: 200,
      ort: "Solothurn",
      budget_pro_m2: 15,
      bezug: "Q1 2027",
      nutzung: "lager",
    }
    expect(feldUebernehmenAenderung("flaeche_min", felder)).toEqual({ flaeche_min: 100 })
    expect(feldUebernehmenAenderung("flaeche_max", felder)).toEqual({ flaeche_max: 200 })
    expect(feldUebernehmenAenderung("ort", felder)).toEqual({ ort: "Solothurn" })
    expect(feldUebernehmenAenderung("budget_pro_m2", felder)).toEqual({ budget_pro_m2: 15 })
    expect(feldUebernehmenAenderung("bezug", felder)).toEqual({ bezug: "Q1 2027" })
    expect(feldUebernehmenAenderung("nutzung", felder)).toEqual({ nutzung: "lager" })
  })
})

describe("feldUnterscheidetSich", () => {
  const ANFRAGE_WERTE: AnfrageWerte = {
    flaeche_min: 100,
    flaeche_max: 200,
    ort: "Solothurn",
    budget_pro_m2: 15,
    bezug: "sofort",
    nutzung: "buero",
  }

  it("liefert false, wenn Zahl (flaeche_min/budget_pro_m2) unverändert ist", () => {
    const felder = { ...LEERE_FELDER, flaeche_min: 100, budget_pro_m2: 15 }
    expect(feldUnterscheidetSich("flaeche_min", felder, ANFRAGE_WERTE)).toBe(false)
    expect(feldUnterscheidetSich("budget_pro_m2", felder, ANFRAGE_WERTE)).toBe(false)
  })

  it("liefert true, wenn eine Zahl abweicht", () => {
    const felder = { ...LEERE_FELDER, flaeche_max: 250 }
    expect(feldUnterscheidetSich("flaeche_max", felder, ANFRAGE_WERTE)).toBe(true)
  })

  it("liefert false, wenn ein Text (ort/bezug) unverändert ist, sonst true", () => {
    expect(feldUnterscheidetSich("ort", { ...LEERE_FELDER, ort: "Solothurn" }, ANFRAGE_WERTE)).toBe(false)
    expect(feldUnterscheidetSich("bezug", { ...LEERE_FELDER, bezug: "Q1 2027" }, ANFRAGE_WERTE)).toBe(true)
  })

  it("liefert true, wenn die Anfrage für das Feld null ist und die Mail einen Wert nennt", () => {
    const ohneOrt: AnfrageWerte = { ...ANFRAGE_WERTE, ort: null }
    expect(feldUnterscheidetSich("ort", { ...LEERE_FELDER, ort: "Solothurn" }, ohneOrt)).toBe(true)
  })

  it("vergleicht nutzung als eigenen Enum-Fall", () => {
    expect(feldUnterscheidetSich("nutzung", { ...LEERE_FELDER, nutzung: "buero" }, ANFRAGE_WERTE)).toBe(false)
    expect(feldUnterscheidetSich("nutzung", { ...LEERE_FELDER, nutzung: "lager" }, ANFRAGE_WERTE)).toBe(true)
  })
})
