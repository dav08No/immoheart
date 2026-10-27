// Endgültig löschen: Admin-Recht zuerst (ohne Recht keine RPC), dann ID, dann RPC,
// beim Objekt danach die Fotodateien; ein Storage-Fehler gibt nur einen Hinweis.
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("@/lib/queries/profile", () => ({ holeBerechtigtesProfil: vi.fn() }))
vi.mock("@/lib/queries/archiv", () => ({
  loescheArchivEintrag: vi.fn(),
  loescheObjektEndgueltig: vi.fn(),
  loescheAnfrageEndgueltig: vi.fn(),
  entferneFotoDateien: vi.fn(),
}))

import { revalidatePath } from "next/cache"
import { anfrageEndgueltigLoeschen, archivEintragLoeschen, objektEndgueltigLoeschen } from "./archiv-loeschen"
import { holeBerechtigtesProfil } from "@/lib/queries/profile"
import {
  entferneFotoDateien,
  loescheAnfrageEndgueltig,
  loescheArchivEintrag,
  loescheObjektEndgueltig,
} from "@/lib/queries/archiv"
import { NutzerFehler } from "@/lib/nutzer-fehler"

const ID = "22222222-2222-2222-2222-222222222222"
const NUR_ADMIN = "Nur Administratoren dürfen endgültig löschen."

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(holeBerechtigtesProfil).mockResolvedValue({ id: "p1", darf_nutzer_anlegen: true } as never)
  vi.mocked(loescheObjektEndgueltig).mockResolvedValue(["o/a.jpg", "o/b.png"])
  vi.mocked(entferneFotoDateien).mockResolvedValue(true)
})

describe("Endgültig löschen", () => {
  it("ohne Admin-Recht: Fehler und keine RPC, auch bei ungültiger ID", async () => {
    vi.mocked(holeBerechtigtesProfil).mockRejectedValue(new Error("Keine Berechtigung"))
    await expect(archivEintragLoeschen(ID)).resolves.toEqual({ fehler: NUR_ADMIN })
    await expect(objektEndgueltigLoeschen("kaputt")).resolves.toEqual({ fehler: NUR_ADMIN })
    await expect(anfrageEndgueltigLoeschen(ID)).resolves.toEqual({ fehler: NUR_ADMIN })
    expect(loescheArchivEintrag).not.toHaveBeenCalled()
    expect(loescheObjektEndgueltig).not.toHaveBeenCalled()
    expect(loescheAnfrageEndgueltig).not.toHaveBeenCalled()
    expect(entferneFotoDateien).not.toHaveBeenCalled()
    expect(revalidatePath).not.toHaveBeenCalled()
  })

  it("reicht einen Redirect (keine Sitzung) durch", async () => {
    vi.mocked(holeBerechtigtesProfil).mockRejectedValue(new Error("NEXT_REDIRECT"))
    await expect(anfrageEndgueltigLoeschen(ID)).rejects.toThrow("NEXT_REDIRECT")
    expect(loescheAnfrageEndgueltig).not.toHaveBeenCalled()
  })

  it("lehnt eine ungültige ID ohne RPC ab", async () => {
    await expect(archivEintragLoeschen("keine-id")).resolves.toEqual({ fehler: "Ungültige ID." })
    await expect(objektEndgueltigLoeschen("keine-id")).resolves.toEqual({ fehler: "Ungültige ID." })
    await expect(anfrageEndgueltigLoeschen("keine-id")).resolves.toEqual({ fehler: "Ungültige ID." })
    expect(loescheArchivEintrag).not.toHaveBeenCalled()
    expect(loescheObjektEndgueltig).not.toHaveBeenCalled()
    expect(loescheAnfrageEndgueltig).not.toHaveBeenCalled()
  })

  it("löscht ein Objekt und danach seine Fotodateien", async () => {
    await expect(objektEndgueltigLoeschen(ID)).resolves.toEqual({ fehler: null })
    expect(loescheObjektEndgueltig).toHaveBeenCalledWith(ID)
    expect(entferneFotoDateien).toHaveBeenCalledWith(["o/a.jpg", "o/b.png"])
    expect(revalidatePath).toHaveBeenCalledWith("/admin/archiv")
    expect(revalidatePath).toHaveBeenCalledWith("/admin")
    expect(revalidatePath).toHaveBeenCalledWith("/admin", "layout")
  })

  it("ein Storage-Fehler ergibt nur einen Hinweis", async () => {
    vi.mocked(entferneFotoDateien).mockResolvedValue(false)
    await expect(objektEndgueltigLoeschen(ID)).resolves.toEqual({
      fehler: null,
      hinweise: ["Fotos konnten nicht vollständig gelöscht werden."],
    })
    expect(revalidatePath).toHaveBeenCalledWith("/admin/archiv")
  })

  it("löscht Archiveintrag und Anfrage per RPC", async () => {
    await expect(archivEintragLoeschen(ID)).resolves.toEqual({ fehler: null })
    await expect(anfrageEndgueltigLoeschen(ID)).resolves.toEqual({ fehler: null })
    expect(loescheArchivEintrag).toHaveBeenCalledWith(ID)
    expect(loescheAnfrageEndgueltig).toHaveBeenCalledWith(ID)
  })

  it("gibt die DB-Meldung (P0001 als NutzerFehler) zurück, ohne Fotos zu löschen", async () => {
    const text = "Nur archivierte Objekte können endgültig gelöscht werden."
    vi.mocked(loescheObjektEndgueltig).mockRejectedValue(new NutzerFehler(text))
    await expect(objektEndgueltigLoeschen(ID)).resolves.toEqual({ fehler: text })
    expect(entferneFotoDateien).not.toHaveBeenCalled()
    expect(revalidatePath).not.toHaveBeenCalled()
  })

  it("wirft unerwartete Fehler durch", async () => {
    vi.mocked(loescheAnfrageEndgueltig).mockRejectedValue(new Error("Deadlock"))
    await expect(anfrageEndgueltigLoeschen(ID)).rejects.toThrow("Deadlock")
  })
})
