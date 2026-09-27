import { describe, expect, it } from "vitest"
import { antwortBetreff, verlaufsKoepfe } from "./verlauf"

describe("verlaufsKoepfe", () => {
  it("liefert null ohne Vorgänger", () => {
    expect(verlaufsKoepfe([])).toEqual({ inReplyTo: null, referenzen: null })
  })
  it("setzt In-Reply-To auf die letzte und References auf alle IDs", () => {
    expect(verlaufsKoepfe(["<a@x>", "<b@x>"])).toEqual({ inReplyTo: "<b@x>", referenzen: "<a@x> <b@x>" })
  })
  it("begrenzt References auf die letzten 10", () => {
    const ids = Array.from({ length: 12 }, (_, i) => `<${i}@x>`)
    const koepfe = verlaufsKoepfe(ids)
    expect(koepfe.inReplyTo).toBe("<11@x>")
    expect(koepfe.referenzen?.split(" ")).toHaveLength(10)
    expect(koepfe.referenzen?.startsWith("<2@x>")).toBe(true)
  })
})

describe("antwortBetreff", () => {
  it("setzt Re: davor", () => {
    expect(antwortBetreff("Lagerfläche Zuchwil")).toBe("Re: Lagerfläche Zuchwil")
  })
  it("verdoppelt kein bestehendes Re:/AW:/WG:", () => {
    expect(antwortBetreff("Re: Anfrage")).toBe("Re: Anfrage")
    expect(antwortBetreff("AW: Anfrage")).toBe("AW: Anfrage")
    expect(antwortBetreff("wg: Anfrage")).toBe("wg: Anfrage")
  })
  it("kürzt auf 200 Zeichen", () => {
    expect(antwortBetreff("x".repeat(300))).toHaveLength(200)
  })
})
