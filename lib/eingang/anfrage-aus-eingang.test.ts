import { describe, expect, it } from "vitest"
import { baueAnfrageEinfuegung, feldUebernehmenAenderung, firmenName } from "./anfrage-aus-eingang"
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
    expect(baueAnfrageEinfuegung(felder, "buero", "firma-1")).toEqual({
      ort: "Solothurn",
      nutzung: "buero",
      flaeche_min: 100,
      flaeche_max: 200,
      budget_pro_m2: 15,
      bezug: "sofort",
      firma_id: "firma-1",
    })
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
