import { beforeEach, describe, expect, it, vi } from "vitest"
import type { OeffentlichesObjekt } from "@/lib/objektsuche"

// Die echten Module importieren "server-only" bzw. den Supabase-Server-Client.
vi.mock("server-only", () => ({}))
vi.mock("@/lib/queries/oeffentlich", () => ({ holeOeffentlicheObjekte: vi.fn() }))

import { holeStartDaten } from "./startseite"
import { holeOeffentlicheObjekte } from "@/lib/queries/oeffentlich"

function objekt(teil: Partial<OeffentlichesObjekt> & { id: string }): OeffentlichesObjekt {
  return {
    titel: "Objekt",
    ort: "Solothurn",
    flaeche: 100,
    preis_pro_m2: null,
    nutzung: "buero",
    eigenschaften: {},
    verfuegbar_ab: "2026-10-01",
    status: "verfuegbar",
    created_at: "2026-09-01T00:00:00Z",
    beschreibung: null,
    titelbild: null,
    ...teil,
  }
}

describe("holeStartDaten", () => {
  beforeEach(() => {
    vi.mocked(holeOeffentlicheObjekte).mockReset()
    vi.spyOn(console, "error").mockImplementation(() => {})
  })

  it("liefert bei einem DB-Fehler leere Daten statt zu werfen", async () => {
    vi.mocked(holeOeffentlicheObjekte).mockRejectedValue(new Error("DB weg"))
    await expect(holeStartDaten(3)).resolves.toEqual({ kennzahlen: null, highlights: [] })
  })

  it("zählt nur verfügbare Objekte, reservierte bleiben als Highlight möglich", async () => {
    vi.mocked(holeOeffentlicheObjekte).mockResolvedValue([
      objekt({ id: "a", ort: "Solothurn", flaeche: 200 }),
      objekt({ id: "b", ort: "Zuchwil", flaeche: 300 }),
      objekt({ id: "c", ort: "Grenchen", flaeche: 999, status: "reserviert", titelbild: "https://x/bild.jpg" }),
    ])
    const daten = await holeStartDaten(3)
    expect(daten.kennzahlen).toEqual({ objekte: 2, flaecheTotal: 500, orte: 2 })
    expect(daten.highlights).toHaveLength(3)
    expect(daten.highlights[0]?.id).toBe("c")
  })

  it("begrenzt die Highlights auf das Maximum", async () => {
    vi.mocked(holeOeffentlicheObjekte).mockResolvedValue([objekt({ id: "a" }), objekt({ id: "b" }), objekt({ id: "c" })])
    const daten = await holeStartDaten(2)
    expect(daten.highlights).toHaveLength(2)
    expect(daten.kennzahlen?.objekte).toBe(3)
  })
})
