// alsGesendetMarkieren muss wie entwurfSenden den Treffer auf 'gesendet' setzen -- best-effort,
// ein Fehler dabei darf die bereits gespeicherte Markierung nicht als Fehlschlag melden.
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("@/lib/queries/profile", () => ({ holeEigenesProfil: vi.fn().mockResolvedValue({ id: "p1" }) }))
vi.mock("@/lib/queries/nachrichten", () => ({ aktualisiereNachricht: vi.fn(), holeNachricht: vi.fn(), legeNachrichtAn: vi.fn() }))
vi.mock("@/lib/queries/versand", () => ({ gibFestsitzendeReservierungFrei: vi.fn(), markiereAlsManuellGesendet: vi.fn() }))
vi.mock("@/lib/queries/anfragen", () => ({ aktualisiereAnfrage: vi.fn().mockResolvedValue(undefined) }))
vi.mock("@/lib/queries/matches", () => ({ markiereMatchAngeboten: vi.fn().mockResolvedValue(undefined) }))

import { alsGesendetMarkieren } from "./entwuerfe"
import { markiereAlsManuellGesendet } from "@/lib/queries/versand"
import { markiereMatchAngeboten } from "@/lib/queries/matches"

const ID = "11111111-1111-1111-1111-111111111111"

beforeEach(() => {
  vi.clearAllMocks()
})

describe("alsGesendetMarkieren", () => {
  it("markiert den verknüpften Treffer als angeboten", async () => {
    vi.mocked(markiereAlsManuellGesendet).mockResolvedValue({ id: ID, anfrage_id: "a1", match_id: "m1" } as never)

    await expect(alsGesendetMarkieren(ID)).resolves.toEqual({ fehler: null })
    expect(markiereMatchAngeboten).toHaveBeenCalledWith("m1")
  })

  it("meldet Erfolg, auch wenn markiereMatchAngeboten fehlschlägt", async () => {
    vi.mocked(markiereAlsManuellGesendet).mockResolvedValue({ id: ID, anfrage_id: null, match_id: "m1" } as never)
    vi.mocked(markiereMatchAngeboten).mockRejectedValueOnce(new Error("db down"))
    const konsole = vi.spyOn(console, "error").mockImplementation(() => {})

    await expect(alsGesendetMarkieren(ID)).resolves.toEqual({ fehler: null })
    expect(konsole).toHaveBeenCalled()
    konsole.mockRestore()
  })

  it("ruft markiereMatchAngeboten ohne match_id nicht auf", async () => {
    vi.mocked(markiereAlsManuellGesendet).mockResolvedValue({ id: ID, anfrage_id: "a1", match_id: null } as never)

    await expect(alsGesendetMarkieren(ID)).resolves.toEqual({ fehler: null })
    expect(markiereMatchAngeboten).not.toHaveBeenCalled()
  })
})
