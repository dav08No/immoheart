import { beforeEach, describe, expect, it, vi } from "vitest"

// Das echte Modul importiert "server-only" und den cookie-basierten Server-Client.
vi.mock("server-only", () => ({}))
const rpc = vi.fn()
vi.mock("@/lib/supabase/server", () => ({ erstelleServerClient: async () => ({ rpc }) }))

import {
  hebeReservierungAuf,
  lehneTrefferAb,
  meldeObjektNichtVerfuegbar,
  reserviereTreffer,
  setzeObjektWiederVerfuegbar,
  vermittleTreffer,
} from "./abschluss"
import { NutzerFehler } from "@/lib/nutzer-fehler"

const zeile = { objekt_id: "o1", anfrage_id: "a1", erledigte_treffer: ["m2", "m3"] }

describe("Übergangs-Queries", () => {
  beforeEach(() => rpc.mockReset())

  it("ruft die passende RPC mit der Treffer-ID auf und mappt die Zeile", async () => {
    rpc.mockResolvedValue({ data: [zeile], error: null })
    await expect(vermittleTreffer("m1")).resolves.toEqual(zeile)
    expect(rpc).toHaveBeenCalledWith("treffer_vermitteln", { p_match: "m1" })
  })

  it("reserviert und hebt auf über die eigenen RPCs", async () => {
    rpc.mockResolvedValue({ data: [{ ...zeile, erledigte_treffer: [] }], error: null })
    await expect(reserviereTreffer("m1")).resolves.toEqual({ ...zeile, erledigte_treffer: [] })
    expect(rpc).toHaveBeenLastCalledWith("treffer_reservieren", { p_match: "m1" })
    await hebeReservierungAuf("m1")
    expect(rpc).toHaveBeenLastCalledWith("reservierung_aufheben", { p_match: "m1" })
  })

  it("liefert bei Objektmeldung anfrage_id null und leere Liste statt null", async () => {
    rpc.mockResolvedValue({ data: [{ objekt_id: "o1", anfrage_id: null, erledigte_treffer: null }], error: null })
    await expect(meldeObjektNichtVerfuegbar("o1")).resolves.toEqual({
      objekt_id: "o1",
      anfrage_id: null,
      erledigte_treffer: [],
    })
    expect(rpc).toHaveBeenCalledWith("objekt_nicht_verfuegbar", { p_objekt: "o1" })
  })

  it("void-Übergänge rufen ihre RPC auf", async () => {
    rpc.mockResolvedValue({ data: null, error: null })
    await expect(lehneTrefferAb("m1")).resolves.toBeUndefined()
    expect(rpc).toHaveBeenLastCalledWith("treffer_ablehnen", { p_match: "m1" })
    await expect(setzeObjektWiederVerfuegbar("o1")).resolves.toBeUndefined()
    expect(rpc).toHaveBeenLastCalledWith("objekt_wieder_verfuegbar", { p_objekt: "o1" })
  })

  it("macht aus raise exception (P0001) einen NutzerFehler mit Originaltext", async () => {
    const text = "Nur angebotene Treffer können reserviert werden."
    rpc.mockResolvedValue({ data: null, error: { code: "P0001", message: text } })
    const fehler = await reserviereTreffer("m1").catch((e: unknown) => e)
    expect(fehler).toBeInstanceOf(NutzerFehler)
    expect((fehler as NutzerFehler).message).toBe(text)
  })

  it("wirft auch bei void-Übergängen P0001 als NutzerFehler", async () => {
    rpc.mockResolvedValue({ data: null, error: { code: "P0001", message: "Das Objekt ist bereits verfügbar." } })
    await expect(setzeObjektWiederVerfuegbar("o1")).rejects.toBeInstanceOf(NutzerFehler)
  })

  it("wirft andere DB-Fehler unverändert weiter", async () => {
    const dbFehler = { code: "40P01", message: "deadlock detected" }
    rpc.mockResolvedValue({ data: null, error: dbFehler })
    const fehler = await vermittleTreffer("m1").catch((e: unknown) => e)
    expect(fehler).toBe(dbFehler)
    expect(fehler).not.toBeInstanceOf(NutzerFehler)
  })

  it("wirft, wenn die RPC keine Zeile liefert", async () => {
    rpc.mockResolvedValue({ data: [], error: null })
    await expect(reserviereTreffer("m1")).rejects.toThrow()
    await expect(reserviereTreffer("m1")).rejects.not.toBeInstanceOf(NutzerFehler)
  })
})
