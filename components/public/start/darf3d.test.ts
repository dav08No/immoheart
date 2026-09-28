import { describe, expect, it } from "vitest"
import { darf3d, type Geraet } from "./darf3d"

const STARK: Geraet = {
  reduzierteBewegung: false,
  webgl: true,
  kerne: 8,
  speicherGb: 8,
  breite: 1280,
}

describe("darf3d", () => {
  it("erlaubt 3D auf einem normalen Gerät", () => {
    expect(darf3d(STARK)).toBe(true)
  })

  it("erlaubt 3D, wenn Kerne und Speicher unbekannt sind", () => {
    expect(darf3d({ ...STARK, kerne: undefined, speicherGb: undefined })).toBe(true)
  })

  it("verbietet 3D bei reduzierter Bewegung", () => {
    expect(darf3d({ ...STARK, reduzierteBewegung: true })).toBe(false)
  })

  it("verbietet 3D ohne WebGL", () => {
    expect(darf3d({ ...STARK, webgl: false })).toBe(false)
  })

  it("verbietet 3D bei höchstens 2 Kernen", () => {
    expect(darf3d({ ...STARK, kerne: 2 })).toBe(false)
    expect(darf3d({ ...STARK, kerne: 3 })).toBe(true)
  })

  it("verbietet 3D bei höchstens 2 GB Speicher", () => {
    expect(darf3d({ ...STARK, speicherGb: 2 })).toBe(false)
    expect(darf3d({ ...STARK, speicherGb: 4 })).toBe(true)
  })

  it("verbietet 3D unter 360 px Breite", () => {
    expect(darf3d({ ...STARK, breite: 359 })).toBe(false)
    expect(darf3d({ ...STARK, breite: 360 })).toBe(true)
  })
})
