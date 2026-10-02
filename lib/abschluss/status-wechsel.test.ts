import { describe, expect, it } from "vitest"
import { anfrageStatusFolge } from "./status-wechsel"

describe("anfrageStatusFolge", () => {
  it("zurück auf offen löst Rematching aus", () => {
    expect(anfrageStatusFolge("ruhend", "offen", false)).toBe("rematch")
    expect(anfrageStatusFolge("vermittelt", "offen", false)).toBe("rematch")
  })

  it("ruhend oder vermittelt setzen entfernt die neu-Treffer", () => {
    expect(anfrageStatusFolge("offen", "ruhend", false)).toBe("neu_loeschen")
    expect(anfrageStatusFolge("offen", "vermittelt", true)).toBe("neu_loeschen")
    expect(anfrageStatusFolge("ruhend", "vermittelt", false)).toBe("neu_loeschen")
  })

  it("offen bleibt offen: Rematching nur bei geänderten Suchfeldern", () => {
    expect(anfrageStatusFolge("offen", "offen", true)).toBe("rematch")
    expect(anfrageStatusFolge("offen", "offen", false)).toBe("nichts")
  })

  it("ruhende oder vermittelte Anfragen werden auch bei geänderten Suchfeldern nicht gematcht", () => {
    expect(anfrageStatusFolge("ruhend", "ruhend", true)).toBe("nichts")
    expect(anfrageStatusFolge("vermittelt", "vermittelt", true)).toBe("nichts")
  })
})
