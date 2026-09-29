// Prüft das bedingte Update aus Task 5 direkt auf Query-Ebene: markiereMatchAngeboten
// setzt status/angeboten_am nur, wenn der Treffer noch 'neu' ist (.eq("status","neu")
// als Teil der WHERE-Bedingung selbst, kein separater Fehler bei fehlendem Treffer --
// der Aufrufer in entwurf-senden.ts behandelt das ohnehin nur best-effort).
import { beforeEach, describe, expect, it, vi } from "vitest"

// lib/queries/fotos.ts (von matches.ts über holeTitelbilder importiert) importiert
// "server-only" -- ausserhalb von Next.js wirft das Paket beim Import.
vi.mock("server-only", () => ({}))

// Aufzeichnender Fake-Client: jede Kettenmethode merkt sich ihre Argumente und gibt
// sich selbst zurück; awaiten löst über .then direkt auf (kein Terminal-Aufruf wie
// .single() nötig, genau wie im echten UPDATE ohne .select() in markiereMatchAngeboten).
type Aufruf = { methode: string; args: unknown[] }
function fakeKette(ergebnis: { data: unknown; error: unknown }) {
  const aufrufe: Aufruf[] = []
  const kette = {
    update: (...args: unknown[]) => (aufrufe.push({ methode: "update", args }), kette),
    select: (...args: unknown[]) => (aufrufe.push({ methode: "select", args }), kette),
    eq: (...args: unknown[]) => (aufrufe.push({ methode: "eq", args }), kette),
    in: (...args: unknown[]) => (aufrufe.push({ methode: "in", args }), kette),
    order: (...args: unknown[]) => (aufrufe.push({ methode: "order", args }), kette),
    limit: (...args: unknown[]) => (aufrufe.push({ methode: "limit", args }), kette),
    maybeSingle: async () => ergebnis,
    then: (resolve: (v: typeof ergebnis) => void) => resolve(ergebnis),
  }
  return { kette, aufrufe }
}

vi.mock("@/lib/supabase/server", () => ({ erstelleServerClient: vi.fn() }))
vi.mock("@/lib/queries/versand", () => ({ holeMatchIdsMitOffenemEntwurf: vi.fn() }))

import { holeBesterMatchFuerAnfrage, markiereMatchAngeboten } from "./matches"
import { erstelleServerClient } from "@/lib/supabase/server"

beforeEach(() => {
  vi.clearAllMocks()
})

describe("markiereMatchAngeboten", () => {
  it("aktualisiert nur status='neu'-Treffer auf gesendet mit angeboten_am", async () => {
    const { kette, aufrufe } = fakeKette({ data: null, error: null })
    vi.mocked(erstelleServerClient).mockResolvedValue({
      from: (tabelle: string) => {
        expect(tabelle).toBe("matches")
        return kette
      },
    } as unknown as Awaited<ReturnType<typeof erstelleServerClient>>)

    await markiereMatchAngeboten("m1")

    expect(aufrufe[0]).toMatchObject({ methode: "update" })
    const payload = aufrufe[0]?.args[0] as { status: string; angeboten_am: string }
    expect(payload.status).toBe("gesendet")
    expect(new Date(payload.angeboten_am).toISOString()).toBe(payload.angeboten_am)
    expect(aufrufe.slice(1)).toEqual([
      { methode: "eq", args: ["id", "m1"] },
      { methode: "eq", args: ["status", "neu"] },
    ])
  })

  it("wirft einen DB-Fehler weiter, statt ihn zu verschlucken", async () => {
    const { kette } = fakeKette({ data: null, error: new Error("db down") })
    vi.mocked(erstelleServerClient).mockResolvedValue({ from: () => kette } as unknown as Awaited<
      ReturnType<typeof erstelleServerClient>
    >)

    await expect(markiereMatchAngeboten("m1")).rejects.toThrow("db down")
  })
})

describe("holeBesterMatchFuerAnfrage", () => {
  it("filtert auf status neu/gesendet", async () => {
    const { kette, aufrufe } = fakeKette({ data: null, error: null })
    vi.mocked(erstelleServerClient).mockResolvedValue({ from: () => kette } as unknown as Awaited<
      ReturnType<typeof erstelleServerClient>
    >)

    await holeBesterMatchFuerAnfrage("a1")

    expect(aufrufe).toContainEqual({ methode: "in", args: ["status", ["neu", "gesendet"]] })
  })
})
