import { describe, expect, it } from "vitest"
import { eigentuemerEmailMitHerkunft, eigentuemerEmailSchema } from "./objekt-eigentuemer"

describe("eigentuemerEmailSchema", () => {
  it("leer, Leerzeichen und null werden null", () => {
    expect(eigentuemerEmailSchema.parse("")).toBeNull()
    expect(eigentuemerEmailSchema.parse("   ")).toBeNull()
    expect(eigentuemerEmailSchema.parse(null)).toBeNull()
  })
  it("gültige Adresse wird getrimmt und kleingeschrieben", () => {
    expect(eigentuemerEmailSchema.parse(" Eigner@Example.CH ")).toBe("eigner@example.ch")
  })
  it("ungültige Adresse wird abgelehnt", () => {
    expect(eigentuemerEmailSchema.safeParse("kein-mail").success).toBe(false)
  })
})

describe("eigentuemerEmailMitHerkunft", () => {
  it("eingetragene Adresse hat Vorrang", () => {
    expect(eigentuemerEmailMitHerkunft("a@b.ch", "c@d.ch")).toBe("a@b.ch")
  })
  it("übernimmt den gültigen Absender kleingeschrieben", () => {
    expect(eigentuemerEmailMitHerkunft(null, "Eigner@Example.ch")).toBe("eigner@example.ch")
  })
  it("ignoriert ungültige oder fehlende Absender", () => {
    expect(eigentuemerEmailMitHerkunft(null, "unbekannt")).toBeNull()
    expect(eigentuemerEmailMitHerkunft(null, null)).toBeNull()
  })
})
