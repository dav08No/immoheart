// Treffer verschwinden nur noch über die RPC treffer_entfernen, damit jeder Abgang
// mit seinem Grund im Archiv landet (Spec §1). Kein direktes DELETE mehr.
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))
vi.mock("@/lib/supabase/server", () => ({ erstelleServerClient: vi.fn() }))

import { entferneNeueTreffer, entferneTreffer } from "./treffer-entfernen"
import { erstelleServerClient } from "@/lib/supabase/server"

type Aufruf = { methode: string; args: unknown[] }

function fakeClient(zeilen: unknown[], rpcFehler: unknown = null) {
  const aufrufe: Aufruf[] = []
  const rpc = vi.fn(async () => ({ data: null, error: rpcFehler }))
  const ergebnis = { data: zeilen, error: null }
  const kette = {
    select: (...args: unknown[]) => (aufrufe.push({ methode: "select", args }), kette),
    eq: (...args: unknown[]) => (aufrufe.push({ methode: "eq", args }), kette),
    delete: (...args: unknown[]) => (aufrufe.push({ methode: "delete", args }), kette),
    then: (resolve: (v: typeof ergebnis) => void) => resolve(ergebnis),
  }
  const from = vi.fn((tabelle: string) => (aufrufe.push({ methode: "from", args: [tabelle] }), kette))
  vi.mocked(erstelleServerClient).mockResolvedValue({ from, rpc } as unknown as Awaited<
    ReturnType<typeof erstelleServerClient>
  >)
  return { aufrufe, rpc, from }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe("entferneTreffer", () => {
  it("ruft treffer_entfernen mit IDs und Grund auf", async () => {
    const { rpc } = fakeClient([])
    await entferneTreffer(["m1", "m2"], "passt nicht mehr")
    expect(rpc).toHaveBeenCalledWith("treffer_entfernen", { p_ids: ["m1", "m2"], p_grund: "passt nicht mehr" })
  })

  it("überspringt die RPC bei leerer Liste", async () => {
    const { rpc } = fakeClient([])
    await entferneTreffer([], "passt nicht mehr")
    expect(rpc).not.toHaveBeenCalled()
  })

  it("wirft einen RPC-Fehler weiter", async () => {
    fakeClient([], new Error("rpc kaputt"))
    await expect(entferneTreffer(["m1"], "passt nicht mehr")).rejects.toThrow("rpc kaputt")
  })
})

describe("entferneNeueTreffer", () => {
  const zeilen = [
    { id: "m1", anfrage_id: "a1", objekt_id: "o1" },
    { id: "m2", anfrage_id: "a1", objekt_id: "o2" },
  ]

  it("selektiert nur neu-Treffer der Seite und löscht nie direkt", async () => {
    const { aufrufe, rpc } = fakeClient(zeilen)
    await entferneNeueTreffer("anfrage_id", "a1", "Anfrage ruhend")
    expect(aufrufe).toContainEqual({ methode: "from", args: ["matches"] })
    expect(aufrufe).toContainEqual({ methode: "eq", args: ["anfrage_id", "a1"] })
    expect(aufrufe).toContainEqual({ methode: "eq", args: ["status", "neu"] })
    expect(aufrufe.some((a) => a.methode === "delete")).toBe(false)
    expect(rpc).toHaveBeenCalledWith("treffer_entfernen", { p_ids: ["m1", "m2"], p_grund: "Anfrage ruhend" })
  })

  it("beschränkt auf die übergebene Gegenseite", async () => {
    const { rpc } = fakeClient(zeilen)
    await entferneNeueTreffer("anfrage_id", "a1", "passt nicht mehr", ["o2"])
    expect(rpc).toHaveBeenCalledWith("treffer_entfernen", { p_ids: ["m2"], p_grund: "passt nicht mehr" })
  })

  it("fragt bei leerer Gegenseite gar nicht erst ab", async () => {
    const { from, rpc } = fakeClient(zeilen)
    await entferneNeueTreffer("objekt_id", "o1", "passt nicht mehr", [])
    expect(from).not.toHaveBeenCalled()
    expect(rpc).not.toHaveBeenCalled()
  })

  it("ruft keine RPC, wenn kein neu-Treffer passt", async () => {
    const { rpc } = fakeClient([])
    await entferneNeueTreffer("objekt_id", "o1", "Objekt nicht verfügbar")
    expect(rpc).not.toHaveBeenCalled()
  })
})
