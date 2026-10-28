import { describe, expect, it } from "vitest"
import { GRUND_MAX, pruefeGrund } from "./grund"
import { NutzerFehler } from "@/lib/nutzer-fehler"

describe("pruefeGrund", () => {
  it("macht aus fehlendem Grund einen leeren Text", () => {
    expect(pruefeGrund(undefined)).toBe("")
    expect(pruefeGrund(null)).toBe("")
    expect(pruefeGrund("   ")).toBe("")
  })

  it("trimmt den Grund", () => {
    expect(pruefeGrund("  Eigentümer verkauft  ")).toBe("Eigentümer verkauft")
  })

  it("erlaubt genau die Höchstlänge nach dem Trimmen", () => {
    expect(pruefeGrund(` ${"a".repeat(GRUND_MAX)} `)).toHaveLength(GRUND_MAX)
  })

  it("lehnt zu lange und nicht-textliche Gründe als NutzerFehler ab", () => {
    expect(() => pruefeGrund("a".repeat(GRUND_MAX + 1))).toThrow(NutzerFehler)
    expect(() => pruefeGrund(42)).toThrow(NutzerFehler)
  })
})
