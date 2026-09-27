import { describe, expect, it } from "vitest"
import {
  endungFuerMime,
  erstesJeObjekt,
  FORMAT_FEHLER,
  istVollstaendigeReihenfolge,
  MAX_FOTO_BYTES,
  naechsteReihenfolge,
  neuerFotoPfad,
  pruefeFoto,
  verschiebe,
  zaehleJeObjekt,
  zerlegeFotoPfad,
} from "./objekt-fotos"

const OBJEKT = "11111111-2222-4333-8444-555555555555"
const DATEI = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee"

describe("endungFuerMime", () => {
  it("leitet die Endung nur aus erlaubten MIME-Typen ab", () => {
    expect(endungFuerMime("image/jpeg")).toBe("jpg")
    expect(endungFuerMime("image/png")).toBe("png")
    expect(endungFuerMime("image/webp")).toBe("webp")
  })
  it("lehnt andere Typen ab, auch Prototyp-Schlüssel", () => {
    for (const mime of ["image/heic", "application/pdf", "image/svg+xml", "", "toString", "__proto__"]) {
      expect(endungFuerMime(mime)).toBeNull()
    }
  })
})

describe("pruefeFoto", () => {
  it("akzeptiert erlaubte Typen bis genau 5 MB", () => {
    expect(pruefeFoto("image/jpeg", 1)).toBeNull()
    expect(pruefeFoto("image/webp", MAX_FOTO_BYTES)).toBeNull()
  })
  it("lehnt zu grosse, leere und ungültige Grössen ab", () => {
    expect(pruefeFoto("image/png", MAX_FOTO_BYTES + 1)).toMatch(/5 MB/)
    expect(pruefeFoto("image/png", 0)).not.toBeNull()
    expect(pruefeFoto("image/png", Number.NaN)).not.toBeNull()
  })
  it("meldet falsches Format mit dem festen Text", () => {
    expect(pruefeFoto("image/heic", 100)).toBe(FORMAT_FEHLER)
  })
})

describe("zerlegeFotoPfad / neuerFotoPfad", () => {
  it("erkennt selbst vergebene Pfade des Objekts", () => {
    const pfad = neuerFotoPfad(OBJEKT, DATEI, "image/png")
    expect(pfad).toBe(`${OBJEKT}/${DATEI}.png`)
    expect(zerlegeFotoPfad(pfad, OBJEKT)).toEqual({ dateiname: `${DATEI}.png` })
  })
  it("vergleicht die Objekt-id ohne Gross-/Kleinschreibung", () => {
    const pfad = neuerFotoPfad(OBJEKT.toUpperCase(), DATEI, "image/jpeg")
    expect(zerlegeFotoPfad(pfad, OBJEKT.toUpperCase())).not.toBeNull()
  })
  it("lehnt fremde Objekte, Unterordner, Traversal und andere Endungen ab", () => {
    const anderes = "99999999-2222-4333-8444-555555555555"
    for (const pfad of [
      `${anderes}/${DATEI}.png`,
      `${OBJEKT}/x/${DATEI}.png`,
      `${OBJEKT}/../${anderes}/${DATEI}.png`,
      `${OBJEKT}/${DATEI}.svg`,
      `${OBJEKT}/${DATEI}.png.exe`,
      `/${OBJEKT}/${DATEI}.png`,
      `${OBJEKT}/foto.png`,
    ]) {
      expect(zerlegeFotoPfad(pfad, OBJEKT)).toBeNull()
    }
  })
})

describe("verschiebe", () => {
  it("verschiebt nach vorne und hinten", () => {
    expect(verschiebe(["a", "b", "c"], 2, 0)).toEqual(["c", "a", "b"])
    expect(verschiebe(["a", "b", "c"], 0, 1)).toEqual(["b", "a", "c"])
  })
  it("lässt die Liste bei Grenzüberschreitung unverändert und mutiert nie", () => {
    const liste = ["a", "b"] as const
    expect(verschiebe(liste, 0, -1)).toEqual(["a", "b"])
    expect(verschiebe(liste, 1, 2)).toEqual(["a", "b"])
    expect(liste).toEqual(["a", "b"])
  })
})

describe("istVollstaendigeReihenfolge", () => {
  it("verlangt genau dieselben ids", () => {
    expect(istVollstaendigeReihenfolge(["a", "b"], ["b", "a"])).toBe(true)
    expect(istVollstaendigeReihenfolge(["a", "b"], ["a"])).toBe(false)
    expect(istVollstaendigeReihenfolge(["a", "b"], ["a", "a"])).toBe(false)
    expect(istVollstaendigeReihenfolge(["a", "b"], ["a", "c"])).toBe(false)
  })
})

describe("naechsteReihenfolge", () => {
  it("hängt hinter dem bisher höchsten Wert an", () => {
    expect(naechsteReihenfolge([])).toBe(0)
    expect(naechsteReihenfolge([{ reihenfolge: 0 }, { reihenfolge: 4 }, { reihenfolge: 2 }])).toBe(5)
  })
})

describe("erstesJeObjekt / zaehleJeObjekt", () => {
  it("nimmt je Objekt die erste Zeile", () => {
    const erste = erstesJeObjekt([
      { objekt_id: "a", pfad: "1" },
      { objekt_id: "b", pfad: "2" },
      { objekt_id: "a", pfad: "3" },
    ])
    expect(erste.get("a")?.pfad).toBe("1")
    expect(erste.get("b")?.pfad).toBe("2")
  })
  it("zählt je Objekt und ignoriert Zeilen ohne Objekt", () => {
    expect(zaehleJeObjekt([{ objekt_id: "a" }, { objekt_id: null }, { objekt_id: "a" }, { objekt_id: "b" }])).toEqual({
      a: 2,
      b: 1,
    })
  })
})
