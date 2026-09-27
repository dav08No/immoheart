import { describe, expect, it } from "vitest"
import { entwurfSchema } from "./entwurf-schema"

describe("entwurfSchema", () => {
  it("normalisiert gültige Eingaben", () => {
    expect(entwurfSchema.parse({ an: " Kunde@Firma.CH ", betreff: " Angebot ", body: "Hallo" })).toEqual({
      an: "kunde@firma.ch",
      betreff: "Angebot",
      body: "Hallo",
    })
  })
  it("lehnt ungültige Adresse, leeren Text und Zeilenumbruch im Betreff ab", () => {
    expect(entwurfSchema.safeParse({ an: "kein-mail", betreff: "A", body: "B" }).success).toBe(false)
    expect(entwurfSchema.safeParse({ an: "a@b.ch", betreff: "A", body: "" }).success).toBe(false)
    expect(entwurfSchema.safeParse({ an: "a@b.ch", betreff: "A\r\nBcc: x@y.ch", body: "B" }).success).toBe(false)
  })
})
