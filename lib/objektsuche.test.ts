import { describe, expect, it } from "vitest"
import { filterZuSuchparametern, leseFilter } from "./objektsuche"

const ORTE = ["Solothurn", "Grenchen"]
const EIGENSCHAFTEN = ["lift", "rampe"]

// searchParamsAls bildet nach, wie Next.js Mehrfachwerte (?a=1&a=2 -> string[]) und
// Einzelwerte (?a=1 -> string) an leseFilter durchreicht.
function searchParamsAls(sp: URLSearchParams): Record<string, string | string[] | undefined> {
  const p: Record<string, string | string[]> = {}
  for (const [k, v] of sp.entries()) {
    const bestehend = p[k]
    if (bestehend === undefined) p[k] = v
    else p[k] = Array.isArray(bestehend) ? [...bestehend, v] : [bestehend, v]
  }
  return p
}

describe("leseFilter", () => {
  it("ignoriert <script> als ort/nutzung/sort", () => {
    const f = leseFilter({ ort: "<script>", nutzung: "<script>", sort: "<script>" }, ORTE, EIGENSCHAFTEN)
    expect(f.orte).toEqual([])
    expect(f.nutzung).toEqual([])
    expect(f.sortierung).toBe("neu")
  })

  it("Zahl abc, -5, 1e9 werden zu null", () => {
    for (const wert of ["abc", "-5", "1e9"]) {
      expect(leseFilter({ flaeche_min: wert }, ORTE, EIGENSCHAFTEN).flaecheMin).toBeNull()
      expect(leseFilter({ preis_max: wert }, ORTE, EIGENSCHAFTEN).preisMax).toBeNull()
    }
  })

  it("tauscht flaeche_min/flaeche_max bei falscher Reihenfolge", () => {
    const f = leseFilter({ flaeche_min: "500", flaeche_max: "100" }, ORTE, EIGENSCHAFTEN)
    expect(f.flaecheMin).toBe(100)
    expect(f.flaecheMax).toBe(500)
  })

  it("akzeptiert Mehrfachwerte als Array und einzeln", () => {
    expect(leseFilter({ ort: ["Solothurn", "Grenchen"] }, ORTE, EIGENSCHAFTEN).orte).toEqual(["Solothurn", "Grenchen"])
    expect(leseFilter({ ort: "Solothurn" }, ORTE, EIGENSCHAFTEN).orte).toEqual(["Solothurn"])
  })

  it("Orte/Nutzung/Eigenschaften nur aus bekannten Listen", () => {
    expect(leseFilter({ ort: "Bern" }, ORTE, EIGENSCHAFTEN).orte).toEqual([])
    expect(leseFilter({ nutzung: "buero" }, ORTE, EIGENSCHAFTEN).nutzung).toEqual(["buero"])
    expect(leseFilter({ eig: ["lift", "unbekannt"] }, ORTE, EIGENSCHAFTEN).eigenschaften).toEqual(["lift"])
  })

  it("Zahlen ausserhalb des Bereichs werden zu null", () => {
    expect(leseFilter({ flaeche_min: "100001" }, ORTE, EIGENSCHAFTEN).flaecheMin).toBeNull()
    expect(leseFilter({ preis_max: "10001" }, ORTE, EIGENSCHAFTEN).preisMax).toBeNull()
    expect(leseFilter({ flaeche_min: "100000" }, ORTE, EIGENSCHAFTEN).flaecheMin).toBe(100000)
  })

  it("Datum nur gültig als YYYY-MM-DD", () => {
    expect(leseFilter({ verfuegbar_bis: "2026-01-15" }, ORTE, EIGENSCHAFTEN).verfuegbarBis).toBe("2026-01-15")
    expect(leseFilter({ verfuegbar_bis: "2026-13-01" }, ORTE, EIGENSCHAFTEN).verfuegbarBis).toBeNull()
    expect(leseFilter({ verfuegbar_bis: "15.01.2026" }, ORTE, EIGENSCHAFTEN).verfuegbarBis).toBeNull()
  })

  it("unbekannte sort wird zu neu", () => {
    expect(leseFilter({ sort: "unbekannt" }, ORTE, EIGENSCHAFTEN).sortierung).toBe("neu")
    expect(leseFilter({ sort: "flaeche" }, ORTE, EIGENSCHAFTEN).sortierung).toBe("flaeche")
    expect(leseFilter({ sort: "preis" }, ORTE, EIGENSCHAFTEN).sortierung).toBe("preis")
  })

  it("ohne Parameter liefert leere/neutrale Werte", () => {
    expect(leseFilter({}, ORTE, EIGENSCHAFTEN)).toEqual({
      nutzung: [],
      orte: [],
      flaecheMin: null,
      flaecheMax: null,
      preisMax: null,
      verfuegbarBis: null,
      eigenschaften: [],
      sortierung: "neu",
    })
  })
})

describe("filterZuSuchparametern", () => {
  it("enthält nur gesetzte Werte und rundet mit leseFilter zurück", () => {
    const f = leseFilter(
      { nutzung: ["buero", "lager"], ort: ["Solothurn"], flaeche_min: "50", preis_max: "300", eig: ["lift"], sort: "preis" },
      ORTE,
      EIGENSCHAFTEN
    )
    const sp = filterZuSuchparametern(f)
    expect(sp.getAll("flaeche_max")).toEqual([])
    expect(sp.getAll("verfuegbar_bis")).toEqual([])
    const zurueck = leseFilter(searchParamsAls(sp), ORTE, EIGENSCHAFTEN)
    expect(zurueck).toEqual(f)
  })

  it("leerer Filter rundet ebenfalls zurück", () => {
    const f = leseFilter({}, ORTE, EIGENSCHAFTEN)
    const zurueck = leseFilter(searchParamsAls(filterZuSuchparametern(f)), ORTE, EIGENSCHAFTEN)
    expect(zurueck).toEqual(f)
  })
})
