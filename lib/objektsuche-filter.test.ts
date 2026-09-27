// Ausgelagert aus objektsuche.test.ts (Datei-Längenlimit): deckt filtereObjekte,
// eigenschaftsSchluessel und aehnlicheObjekte ab, leseFilter/filterZuSuchparametern
// stehen in objektsuche.test.ts.
import { describe, expect, it } from "vitest"
import { aehnlicheObjekte, eigenschaftsSchluessel, filtereObjekte, leseFilter, type OeffentlichesObjekt } from "./objektsuche"

const ORTE = ["Solothurn", "Grenchen"]
const EIGENSCHAFTEN = ["lift", "rampe"]

function obj(p: Partial<OeffentlichesObjekt> & { id: string }): OeffentlichesObjekt {
  return {
    titel: "Objekt",
    ort: "Solothurn",
    flaeche: 100,
    preis_pro_m2: 200,
    nutzung: "buero",
    eigenschaften: {},
    verfuegbar_ab: "2026-01-01",
    status: "verfuegbar",
    created_at: "2026-01-01T00:00:00Z",
    beschreibung: null,
    titelbild: null,
    ...p,
  }
}

describe("filtereObjekte", () => {
  const basis = leseFilter({}, ORTE, EIGENSCHAFTEN)
  const a = obj({ id: "a", nutzung: "buero", ort: "Solothurn", flaeche: 50, preis_pro_m2: 100, verfuegbar_ab: "2026-01-01" })
  const b = obj({ id: "b", nutzung: "lager", ort: "Grenchen", flaeche: 150, preis_pro_m2: null, verfuegbar_ab: "2026-06-01" })
  const c = obj({ id: "c", nutzung: "gewerbe", ort: "Solothurn", flaeche: 250, preis_pro_m2: 500, verfuegbar_ab: "2026-03-01" })
  const alle = [a, b, c]

  it("Nutzung filtert (ODER innerhalb)", () => {
    expect(filtereObjekte(alle, { ...basis, nutzung: ["buero", "lager"] })).toEqual([a, b])
  })

  it("Orte filtern (ODER innerhalb)", () => {
    expect(filtereObjekte(alle, { ...basis, orte: ["Grenchen"] })).toEqual([b])
  })

  it("Flächen-Min/Max filtern", () => {
    expect(filtereObjekte(alle, { ...basis, flaecheMin: 100 })).toEqual([b, c])
    expect(filtereObjekte(alle, { ...basis, flaecheMax: 100 })).toEqual([a])
  })

  it("preisMax schliesst Objekte ohne Preis nicht aus", () => {
    expect(filtereObjekte(alle, { ...basis, preisMax: 100 })).toEqual([a, b])
  })

  it("verfuegbarBis: verfügbar spätestens an diesem Tag", () => {
    expect(filtereObjekte(alle, { ...basis, verfuegbarBis: "2026-03-01" })).toEqual([a, c])
  })

  it("Eigenschaften: jeder gewählte Schlüssel muss truthy sein", () => {
    const mitLift = obj({ id: "d", eigenschaften: { lift: true, rampe: false } })
    const ohne = obj({ id: "e", eigenschaften: { lift: false } })
    expect(filtereObjekte([mitLift, ohne], { ...basis, eigenschaften: ["lift"] })).toEqual([mitLift])
    expect(filtereObjekte([mitLift, ohne], { ...basis, eigenschaften: ["lift", "rampe"] })).toEqual([])
  })

  it("alle Kriterien sind UND-verknüpft", () => {
    expect(filtereObjekte(alle, { ...basis, nutzung: ["buero"], orte: ["Grenchen"] })).toEqual([])
  })

  it("Sortierung neu: created_at absteigend", () => {
    const x = obj({ id: "x", created_at: "2026-01-01T00:00:00Z" })
    const y = obj({ id: "y", created_at: "2026-03-01T00:00:00Z" })
    expect(filtereObjekte([x, y], { ...basis, sortierung: "neu" })).toEqual([y, x])
  })

  it("Sortierung flaeche: aufsteigend", () => {
    expect(filtereObjekte(alle, { ...basis, sortierung: "flaeche" })).toEqual([a, b, c])
  })

  it("Sortierung preis: aufsteigend, null am Ende", () => {
    expect(filtereObjekte(alle, { ...basis, sortierung: "preis" })).toEqual([a, c, b])
  })
})

describe("eigenschaftsSchluessel", () => {
  it("nur Schlüssel mit truthy Wert in mind. einem Objekt, sortiert, ignoriert false/0", () => {
    const o1 = obj({ id: "1", eigenschaften: { lift: true, rampe: false, klima: 0 } })
    const o2 = obj({ id: "2", eigenschaften: { bahnanschluss: 1 } })
    expect(eigenschaftsSchluessel([o1, o2])).toEqual(["bahnanschluss", "lift"])
  })
})

describe("aehnlicheObjekte", () => {
  it("gleiche Nutzung oder gleicher Ort, ohne sich selbst, nach Flächen-Nähe, begrenzt auf max", () => {
    const ziel = obj({ id: "ziel", nutzung: "buero", ort: "Solothurn", flaeche: 100 })
    const naeher = obj({ id: "naeher", nutzung: "buero", ort: "Bern", flaeche: 120 })
    const weiter = obj({ id: "weiter", nutzung: "lager", ort: "Solothurn", flaeche: 400 })
    const fremd = obj({ id: "fremd", nutzung: "lager", ort: "Bern", flaeche: 100 })
    const ergebnis = aehnlicheObjekte([ziel, naeher, weiter, fremd], ziel, 5)
    expect(ergebnis).not.toContainEqual(ziel)
    expect(ergebnis).toEqual([naeher, weiter])
  })

  it("begrenzt auf max", () => {
    const ziel = obj({ id: "ziel", nutzung: "buero", flaeche: 100 })
    const andere = [1, 2, 3].map((n) => obj({ id: `o${n}`, nutzung: "buero", flaeche: 100 + n }))
    expect(aehnlicheObjekte([ziel, ...andere], ziel, 2)).toHaveLength(2)
  })
})
