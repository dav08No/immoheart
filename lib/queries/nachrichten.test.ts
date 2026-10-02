// Prüft das bedingte Update für den Dank-Entwurf einer manuell zugeordneten Objektmeldung:
// nur der offene eigentuemer_info-Entwurf zu genau diesem Eingang, nur ohne objekt_id.
import { describe, expect, it, vi } from "vitest"

type Aufruf = { methode: string; args: unknown[] }
function fakeKette() {
  const aufrufe: Aufruf[] = []
  const merke = (methode: string) => (...args: unknown[]) => (aufrufe.push({ methode, args }), kette)
  const kette = {
    update: merke("update"),
    eq: merke("eq"),
    is: merke("is"),
    then: (resolve: (v: { data: null; error: null }) => void) => resolve({ data: null, error: null }),
  }
  return { kette, aufrufe }
}

vi.mock("@/lib/supabase/server", () => ({ erstelleServerClient: vi.fn() }))

import { verknuepfeDankEntwurfMitObjekt } from "./nachrichten"
import { erstelleServerClient } from "@/lib/supabase/server"

describe("verknuepfeDankEntwurfMitObjekt", () => {
  it("setzt objekt_id nur am offenen, ungelöschten Dank-Entwurf ohne Objekt", async () => {
    const { kette, aufrufe } = fakeKette()
    vi.mocked(erstelleServerClient).mockResolvedValue({
      from: (tabelle: string) => {
        expect(tabelle).toBe("nachrichten")
        return kette
      },
    } as unknown as Awaited<ReturnType<typeof erstelleServerClient>>)

    await verknuepfeDankEntwurfMitObjekt("e1", "o1")

    expect(aufrufe).toEqual([
      { methode: "update", args: [{ objekt_id: "o1" }] },
      { methode: "eq", args: ["antwort_auf", "e1"] },
      { methode: "eq", args: ["typ", "eigentuemer_info"] },
      { methode: "eq", args: ["richtung", "entwurf"] },
      { methode: "is", args: ["geloescht_am", null] },
      { methode: "is", args: ["objekt_id", null] },
    ])
  })
})
