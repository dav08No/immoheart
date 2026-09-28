import { describe, expect, it } from "vitest"
import { formatBytes, speicherAnteil } from "./speicher"

describe("speicherAnteil", () => {
  it("liefert Leerwerte ohne Buckets", () => {
    expect(speicherAnteil([])).toEqual({ belegt: 0, anteil: 0, nachBucket: [] })
  })

  it("summiert Bytes, berechnet den Anteil an der Grenze und sortiert Buckets absteigend", () => {
    const ergebnis = speicherAnteil(
      [
        { bucket: "objekt-fotos", bytes: 100 },
        { bucket: "anhaenge", bytes: 300 },
        { bucket: "avatare", bytes: 200 },
      ],
      1000
    )
    expect(ergebnis).toEqual({
      belegt: 600,
      anteil: 0.6,
      nachBucket: [
        { bucket: "anhaenge", bytes: 300 },
        { bucket: "avatare", bytes: 200 },
        { bucket: "objekt-fotos", bytes: 100 },
      ],
    })
  })

  it("kann über 1 liegen, wenn die Grenze überschritten ist", () => {
    expect(speicherAnteil([{ bucket: "x", bytes: 2000 }], 1000).anteil).toBe(2)
  })
})

describe("formatBytes", () => {
  it("zeigt Bytes ohne Nachkommastellen", () => {
    expect(formatBytes(500)).toBe("500 B")
  })
  it("zeigt 3 signifikante Stellen: 1 Nachkommastelle ab 10, 0 ab 100", () => {
    expect(formatBytes(12.3 * 1024 * 1024)).toBe("12.3 MB")
    expect(formatBytes(250 * 1024 * 1024)).toBe("250 MB")
  })
  it("zeigt 2 Nachkommastellen unter 10", () => {
    expect(formatBytes(1.02 * 1024 * 1024 * 1024)).toBe("1.02 GB")
  })
})
