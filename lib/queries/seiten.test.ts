import { describe, expect, it } from "vitest"
import { alleSeiten, SEITE } from "./seiten"

describe("alleSeiten", () => {
  it("blättert, bis eine Seite kürzer als SEITE ist", async () => {
    const aufrufe: [number, number][] = []
    const zeilen = await alleSeiten(async (von, bis) => {
      aufrufe.push([von, bis])
      return { data: Array.from({ length: von === 0 ? SEITE : 3 }, (_, i) => von + i), error: null }
    })
    expect(aufrufe).toEqual([[0, SEITE - 1], [SEITE, 2 * SEITE - 1]])
    expect(zeilen).toHaveLength(SEITE + 3)
  })

  it("wirft den Fehler der Abfrage weiter", async () => {
    await expect(alleSeiten(async () => ({ data: null, error: new Error("kaputt") }))).rejects.toThrow("kaputt")
  })
})
