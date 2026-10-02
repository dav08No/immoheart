import { describe, expect, it } from "vitest"
import { absageEmpfaenger, baueInteressenten, type InteressentRoh } from "./interessenten"

function roh(id: string, status: InteressentRoh["status"], firma: string | null = `Firma ${id}`): InteressentRoh {
  return { id, status, angeboten_am: "2026-09-20T10:00:00Z", anfrage: { status: "offen", firma } }
}

describe("baueInteressenten", () => {
  it("lässt neue und verworfene Treffer weg", () => {
    const liste = baueInteressenten([roh("m1", "neu"), roh("m2", "verworfen"), roh("m3", "gesendet")])
    expect(liste.map((i) => i.id)).toEqual(["m3"])
  })

  it("zählt andere angebotene Treffer ohne den eigenen", () => {
    const liste = baueInteressenten([roh("m1", "gesendet"), roh("m2", "gesendet"), roh("m3", "reserviert"), roh("m4", "erledigt")])
    expect(liste.find((i) => i.id === "m1")?.andereAngebote).toBe(1)
    expect(liste.find((i) => i.id === "m3")?.andereAngebote).toBe(2)
  })

  it("übernimmt Firma und Anfrage-Status, mit Ersatzname ohne Firma", () => {
    const [ohneFirma] = baueInteressenten([{ ...roh("m1", "gesendet", null), anfrage: null }])
    expect(ohneFirma).toMatchObject({ firma: "Unbekannte Firma", anfrageStatus: "offen" })
    const [mitFirma] = baueInteressenten([{ ...roh("m2", "reserviert", "Muster AG"), anfrage: { status: "vermittelt", firma: "Muster AG" } }])
    expect(mitFirma).toMatchObject({ firma: "Muster AG", anfrageStatus: "vermittelt", status: "reserviert" })
  })
})

describe("absageEmpfaenger", () => {
  it("zählt angebotene und reservierte Treffer, die die Objektmeldung schliesst", () => {
    const liste = baueInteressenten([roh("m1", "gesendet"), roh("m2", "reserviert"), roh("m3", "abgelehnt"), roh("m4", "vermittelt")])
    expect(absageEmpfaenger(liste)).toBe(2)
    expect(absageEmpfaenger([])).toBe(0)
  })
})
