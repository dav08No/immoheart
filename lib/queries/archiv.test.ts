import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))
const rpc = vi.fn()
const single = vi.fn()
// Signatur mit Tabellenname, damit toHaveBeenCalledWith("objekte") typisiert bleibt.
const from = vi.fn<(tabelle: string) => unknown>(() => ({ select: () => ({ eq: () => ({ single }) }) }))
vi.mock("@/lib/supabase/server", () => ({ erstelleServerClient: async () => ({ rpc, from }) }))
const remove = vi.fn()
const storageFrom = vi.fn(() => ({ remove }))
vi.mock("@/lib/supabase/admin", () => ({ erstelleAdminClient: () => ({ storage: { from: storageFrom } }) }))

import {
  archiviereObjekt,
  entferneFotoDateien,
  loescheArchivEintrag,
  loescheObjektEndgueltig,
  stelleAnfrageWiederHer,
  stelleObjektWiederHer,
} from "./archiv"
import { NutzerFehler } from "@/lib/nutzer-fehler"

beforeEach(() => {
  rpc.mockReset()
  single.mockReset()
  from.mockClear()
  remove.mockReset()
  storageFrom.mockClear()
})

describe("Archiv-Queries", () => {
  it("ruft objekt_archivieren mit ID und Grund auf", async () => {
    rpc.mockResolvedValue({ data: null, error: null })
    await archiviereObjekt("o1", "verkauft")
    expect(rpc).toHaveBeenCalledWith("objekt_archivieren", { p_id: "o1", p_grund: "verkauft" })
  })

  it("macht aus P0001 einen NutzerFehler mit dem DB-Text", async () => {
    const message = "Zuerst die Reservierung aufheben oder abschliessen."
    rpc.mockResolvedValue({ data: null, error: { code: "P0001", message } })
    await expect(archiviereObjekt("o1", "")).rejects.toThrow(new NutzerFehler(message))
  })

  it("liest den Status nach dem Wiederherstellen", async () => {
    rpc.mockResolvedValue({ data: null, error: null })
    single.mockResolvedValue({ data: { status: "verfuegbar" }, error: null })
    await expect(stelleObjektWiederHer("o1")).resolves.toBe("verfuegbar")
    expect(rpc).toHaveBeenCalledWith("objekt_wiederherstellen", { p_id: "o1" })
    expect(from).toHaveBeenCalledWith("objekte")
  })

  it("liefert null statt eines Fehlers, wenn der Status danach nicht lesbar ist", async () => {
    rpc.mockResolvedValue({ data: null, error: null })
    single.mockResolvedValue({ data: null, error: { message: "netz" } })
    const konsole = vi.spyOn(console, "error").mockImplementation(() => {})
    await expect(stelleAnfrageWiederHer("a1")).resolves.toBeNull()
    konsole.mockRestore()
  })
})

describe("Endgültig löschen (Queries)", () => {
  it("liefert die Fotopfade aus objekt_endgueltig_loeschen", async () => {
    rpc.mockResolvedValue({ data: [{ foto_pfade: ["o1/a.jpg"] }], error: null })
    await expect(loescheObjektEndgueltig("o1")).resolves.toEqual(["o1/a.jpg"])
    expect(rpc).toHaveBeenCalledWith("objekt_endgueltig_loeschen", { p_id: "o1" })
  })

  it("macht aus der Admin-Sperre der DB (P0001) einen NutzerFehler", async () => {
    const message = "Nur Administratoren dürfen endgültig löschen."
    rpc.mockResolvedValue({ data: null, error: { code: "P0001", message } })
    await expect(loescheArchivEintrag("t1")).rejects.toThrow(new NutzerFehler(message))
  })

  it("entfernt Fotodateien im Bucket objekt-fotos, ohne Pfade gar nicht", async () => {
    await expect(entferneFotoDateien([])).resolves.toBe(true)
    expect(remove).not.toHaveBeenCalled()
    remove.mockResolvedValue({ data: [], error: null })
    await expect(entferneFotoDateien(["o1/a.jpg"])).resolves.toBe(true)
    expect(storageFrom).toHaveBeenCalledWith("objekt-fotos")
    expect(remove).toHaveBeenCalledWith(["o1/a.jpg"])
  })

  it("meldet einen Storage-Fehler nur als false und protokolliert ihn", async () => {
    const konsole = vi.spyOn(console, "error").mockImplementation(() => {})
    remove.mockResolvedValue({ data: null, error: { message: "weg" } })
    await expect(entferneFotoDateien(["o1/a.jpg"])).resolves.toBe(false)
    remove.mockRejectedValue(new Error("netz"))
    await expect(entferneFotoDateien(["o1/a.jpg"])).resolves.toBe(false)
    expect(konsole).toHaveBeenCalledTimes(2)
    konsole.mockRestore()
  })
})
