import { describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

// Kette, die jeden Aufruf mitschreibt und bei range() eine leere Seite liefert.
type Aufruf = [string, ...unknown[]]
const protokoll = new Map<string, Aufruf[]>()
function kette(tabelle: string) {
  const aufrufe: Aufruf[] = []
  protokoll.set(tabelle, aufrufe)
  const k: Record<string, (...args: unknown[]) => unknown> = {}
  for (const name of ["select", "or", "eq", "gte", "order"]) {
    k[name] = (...args: unknown[]) => {
      aufrufe.push([name, ...args])
      return k
    }
  }
  k.range = async () => ({ data: [], error: null })
  return k
}
const from = vi.fn((tabelle: string) => kette(tabelle))
vi.mock("@/lib/supabase/server", () => ({ erstelleServerClient: async () => ({ from }) }))

import { holeRapportRohdaten } from "./rapport"

describe("holeRapportRohdaten", () => {
  it("läuft mit genau 6 Abfragen und filtert ab dem Puffertag", async () => {
    const roh = await holeRapportRohdaten({ abfrageAb: "2025-10-26" })
    expect(from.mock.calls.map(([t]) => t)).toEqual(["anfragen", "objekte", "firmen", "matches", "treffer_archiv", "nachrichten"])
    expect(roh).toEqual({ anfragen: [], objekte: [], firmen: [], treffer: [], trefferArchiv: [], angebote: [] })
    expect(protokoll.get("matches")).toContainEqual(["or", "created_at.gte.2025-10-26,abgeschlossen_am.gte.2025-10-26,angeboten_am.not.is.null"])
    expect(protokoll.get("treffer_archiv")).toContainEqual(["or", "treffer_erstellt_am.gte.2025-10-26,archiviert_am.gte.2025-10-26"])
    expect(protokoll.get("nachrichten")).toEqual(
      expect.arrayContaining([["eq", "typ", "angebot"], ["eq", "richtung", "gesendet"], ["gte", "gesendet_am", "2025-10-26"]])
    )
  })

  it("lädt keine Spalten mit Personendaten", async () => {
    await holeRapportRohdaten({ abfrageAb: "2025-10-26" })
    const spalten = [...protokoll.values()].flatMap((a) => a.filter(([n]) => n === "select").map(([, s]) => String(s)))
    for (const verboten of ["email", "kontakt", "eigentuemer", "body", "betreff", "von", "an,"]) {
      expect(spalten.join(" | ")).not.toMatch(new RegExp(`\\b${verboten}`))
    }
  })
})
