// Rematching in beiden Richtungen: Archiviertes bekommt nie Treffer, und jeder Abgang
// läuft mit Grund über entferneNeueTreffer statt über ein direktes DELETE.
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))
vi.mock("@/lib/supabase/server", () => ({ erstelleServerClient: vi.fn() }))
vi.mock("@/lib/queries/fotos", () => ({ holeTitelbilder: vi.fn() }))
vi.mock("@/lib/queries/versand", () => ({ holeMatchIdsMitOffenemEntwurf: vi.fn() }))
vi.mock("@/lib/queries/treffer-entfernen", () => ({ entferneNeueTreffer: vi.fn() }))
vi.mock("@/lib/matching", () => ({ berechneMatch: vi.fn() }))
vi.mock("@/lib/queries/anfragen", () => ({
  holeAnfrage: vi.fn(),
  holeOffeneAnfragen: vi.fn(),
  zuAnfrageDomain: (row: { id: string }) => ({ id: row.id }),
}))
vi.mock("@/lib/queries/objekte", () => ({
  holeObjekt: vi.fn(),
  holeVerfuegbareObjekte: vi.fn(),
  zuObjektDomain: (row: { id: string }) => ({ id: row.id }),
}))

import { berechneUndSpeichereMatchesFuerAnfrage, berechneUndSpeichereMatchesFuerObjekt } from "./matches"
import { erstelleServerClient } from "@/lib/supabase/server"
import { entferneNeueTreffer } from "@/lib/queries/treffer-entfernen"
import { berechneMatch } from "@/lib/matching"
import { holeAnfrage, holeOffeneAnfragen } from "@/lib/queries/anfragen"
import { holeObjekt, holeVerfuegbareObjekte } from "@/lib/queries/objekte"

type Zeile = never
const upsert = vi.fn(async () => ({ error: null }))
const treffer = { anfrageId: "", objektId: "", score: 80, kriterien: [], hinweis: "" }

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(erstelleServerClient).mockResolvedValue({ from: () => ({ upsert }) } as unknown as Awaited<
    ReturnType<typeof erstelleServerClient>
  >)
  // o1/a1 passen, o2/a2 nicht.
  vi.mocked(berechneMatch).mockImplementation((a, o) =>
    a.id === "a2" || o.id === "o2" ? null : (treffer as ReturnType<typeof berechneMatch>)
  )
  vi.mocked(holeVerfuegbareObjekte).mockResolvedValue([{ id: "o1" }, { id: "o2" }] as Zeile[])
  vi.mocked(holeOffeneAnfragen).mockResolvedValue([{ id: "a1" }, { id: "a2" }] as Zeile[])
})

describe("berechneUndSpeichereMatchesFuerAnfrage", () => {
  it("rechnet für eine archivierte Anfrage nichts und entfernt nichts", async () => {
    vi.mocked(holeAnfrage).mockResolvedValue({ id: "a1", archiviert_am: "2026-10-01T00:00:00Z" } as Zeile)
    await berechneUndSpeichereMatchesFuerAnfrage("a1")
    expect(upsert).not.toHaveBeenCalled()
    expect(entferneNeueTreffer).not.toHaveBeenCalled()
  })

  it("upsertet Treffer und entfernt die übrigen mit 'passt nicht mehr'", async () => {
    vi.mocked(holeAnfrage).mockResolvedValue({ id: "a1", archiviert_am: null } as Zeile)
    await berechneUndSpeichereMatchesFuerAnfrage("a1")
    expect(upsert).toHaveBeenCalledTimes(1)
    expect(upsert).toHaveBeenCalledWith(expect.objectContaining({ anfrage_id: "a1", objekt_id: "o1" }), {
      onConflict: "anfrage_id,objekt_id",
    })
    expect(entferneNeueTreffer).toHaveBeenCalledWith("anfrage_id", "a1", "passt nicht mehr", ["o2"])
  })
})

describe("berechneUndSpeichereMatchesFuerObjekt", () => {
  it("rechnet für ein archiviertes Objekt nichts und entfernt nichts", async () => {
    vi.mocked(holeObjekt).mockResolvedValue({
      id: "o1",
      status: "verfuegbar",
      archiviert_am: "2026-10-01T00:00:00Z",
    } as Zeile)
    await berechneUndSpeichereMatchesFuerObjekt("o1")
    expect(upsert).not.toHaveBeenCalled()
    expect(entferneNeueTreffer).not.toHaveBeenCalled()
  })

  it("entfernt bei nicht verfügbarem Objekt die neu-Treffer mit Grund", async () => {
    vi.mocked(holeObjekt).mockResolvedValue({ id: "o1", status: "vermietet", archiviert_am: null } as Zeile)
    await berechneUndSpeichereMatchesFuerObjekt("o1")
    expect(upsert).not.toHaveBeenCalled()
    expect(entferneNeueTreffer).toHaveBeenCalledWith("objekt_id", "o1", "Objekt nicht verfügbar")
  })

  it("upsertet Treffer und entfernt die übrigen mit 'passt nicht mehr'", async () => {
    vi.mocked(holeObjekt).mockResolvedValue({ id: "o1", status: "verfuegbar", archiviert_am: null } as Zeile)
    await berechneUndSpeichereMatchesFuerObjekt("o1")
    expect(upsert).toHaveBeenCalledTimes(1)
    expect(upsert).toHaveBeenCalledWith(expect.objectContaining({ anfrage_id: "a1", objekt_id: "o1" }), {
      onConflict: "anfrage_id,objekt_id",
    })
    expect(entferneNeueTreffer).toHaveBeenCalledWith("objekt_id", "o1", "passt nicht mehr", ["a2"])
  })
})
