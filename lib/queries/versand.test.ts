// Dedup-Abfragen für offene Angebots-/Nachfass-Entwürfe direkt auf Query-Ebene: Filter
// (entwurf, Typ, nicht gelöscht) und limit(1), damit Altbestände mit zwei offenen
// Entwürfen nicht an maybeSingle (PGRST116) scheitern.
import { beforeEach, describe, expect, it, vi } from "vitest"

type Aufruf = { methode: string; args: unknown[] }
function fakeKette(ergebnis: { data: unknown; error: unknown }) {
  const aufrufe: Aufruf[] = []
  const merke = (methode: string) => (...args: unknown[]) => (aufrufe.push({ methode, args }), kette)
  const kette = {
    select: merke("select"),
    eq: merke("eq"),
    in: merke("in"),
    is: merke("is"),
    order: merke("order"),
    limit: merke("limit"),
    maybeSingle: async () => (aufrufe.push({ methode: "maybeSingle", args: [] }), ergebnis),
    then: (resolve: (v: typeof ergebnis) => void) => resolve(ergebnis),
  }
  return { kette, aufrufe }
}

vi.mock("@/lib/supabase/server", () => ({ erstelleServerClient: vi.fn() }))

import { holeMatchIdsMitOffenemEntwurf, holeOffenenAngebotsEntwurf, holeOffenenNachfassEntwurf } from "./versand"
import { erstelleServerClient } from "@/lib/supabase/server"

function mitKette(ergebnis: { data: unknown; error: unknown }) {
  const { kette, aufrufe } = fakeKette(ergebnis)
  vi.mocked(erstelleServerClient).mockResolvedValue({
    from: (tabelle: string) => {
      expect(tabelle).toBe("nachrichten")
      return kette
    },
  } as unknown as Awaited<ReturnType<typeof erstelleServerClient>>)
  return aufrufe
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe("holeOffenenAngebotsEntwurf", () => {
  it("filtert auf offene Angebots-Entwürfe des Treffers und nimmt den jüngsten", async () => {
    const aufrufe = mitKette({ data: { id: "n1" }, error: null })

    await expect(holeOffenenAngebotsEntwurf("m1")).resolves.toEqual({ id: "n1" })
    expect(aufrufe).toEqual([
      { methode: "select", args: ["*"] },
      { methode: "eq", args: ["match_id", "m1"] },
      { methode: "eq", args: ["richtung", "entwurf"] },
      { methode: "eq", args: ["typ", "angebot"] },
      { methode: "is", args: ["geloescht_am", null] },
      { methode: "order", args: ["created_at", { ascending: false }] },
      { methode: "limit", args: [1] },
      { methode: "maybeSingle", args: [] },
    ])
  })

  it("wirft DB-Fehler weiter", async () => {
    mitKette({ data: null, error: new Error("kaputt") })
    await expect(holeOffenenAngebotsEntwurf("m1")).rejects.toThrow("kaputt")
  })
})

describe("holeOffenenNachfassEntwurf", () => {
  it("filtert auf offene Nachfass-Entwürfe der Anfrage und nimmt den jüngsten", async () => {
    const aufrufe = mitKette({ data: null, error: null })

    await expect(holeOffenenNachfassEntwurf("a1")).resolves.toBeNull()
    expect(aufrufe).toEqual([
      { methode: "select", args: ["*"] },
      { methode: "eq", args: ["anfrage_id", "a1"] },
      { methode: "eq", args: ["richtung", "entwurf"] },
      { methode: "eq", args: ["typ", "nachfass"] },
      { methode: "is", args: ["geloescht_am", null] },
      { methode: "order", args: ["created_at", { ascending: false }] },
      { methode: "limit", args: [1] },
      { methode: "maybeSingle", args: [] },
    ])
  })
})

describe("holeMatchIdsMitOffenemEntwurf", () => {
  it("fragt ohne Treffer gar nicht ab", async () => {
    await expect(holeMatchIdsMitOffenemEntwurf([])).resolves.toEqual(new Set())
    expect(erstelleServerClient).not.toHaveBeenCalled()
  })

  it("filtert auf offene Angebots-Entwürfe und liefert die match_id-Menge ohne null", async () => {
    const aufrufe = mitKette({ data: [{ match_id: "m1" }, { match_id: null }, { match_id: "m1" }], error: null })

    await expect(holeMatchIdsMitOffenemEntwurf(["m1", "m2"])).resolves.toEqual(new Set(["m1"]))
    expect(aufrufe).toEqual([
      { methode: "select", args: ["match_id"] },
      { methode: "in", args: ["match_id", ["m1", "m2"]] },
      { methode: "eq", args: ["richtung", "entwurf"] },
      { methode: "eq", args: ["typ", "angebot"] },
      { methode: "is", args: ["geloescht_am", null] },
    ])
  })
})
