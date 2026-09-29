import { describe, expect, it } from "vitest"
import { initialen } from "./initialen"

describe("initialen", () => {
  it("nimmt höchstens zwei Anfangsbuchstaben, gross", () => {
    expect(initialen("anna maria berger")).toBe("AM")
    expect(initialen("Davide  Nocito")).toBe("DN")
  })
  it("liefert ? für leere Namen", () => {
    expect(initialen("")).toBe("?")
    expect(initialen("   ")).toBe("?")
  })
})
