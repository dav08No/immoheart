// anfrageAktualisieren kann seit dem Abschluss Treffer löschen: Profil-Prüfung zuerst und
// nur gültige Status (offen/ruhend/vermittelt) -- sonst kein Schreibzugriff.
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("@/lib/queries/profile", () => ({ holeEigenesProfil: vi.fn() }))
vi.mock("@/lib/queries/anfragen", () => ({ legeAnfrageAn: vi.fn(), aktualisiereAnfrage: vi.fn(), holeAnfrage: vi.fn() }))
vi.mock("@/lib/queries/matches", () => ({ berechneUndSpeichereMatchesFuerAnfrage: vi.fn() }))
vi.mock("@/lib/queries/angebote", () => ({ loescheNeueMatchesFuerAnfrage: vi.fn() }))

import { anfrageAktualisieren } from "./anfragen"
import { holeEigenesProfil } from "@/lib/queries/profile"
import { aktualisiereAnfrage, holeAnfrage } from "@/lib/queries/anfragen"
import { loescheNeueMatchesFuerAnfrage } from "@/lib/queries/angebote"

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(holeEigenesProfil).mockResolvedValue({ id: "p1" } as never)
  vi.mocked(holeAnfrage).mockResolvedValue({ id: "a1", status: "offen" } as never)
})

describe("anfrageAktualisieren", () => {
  it("prüft zuerst das Profil und schreibt ohne Sitzung nichts", async () => {
    vi.mocked(holeEigenesProfil).mockRejectedValue(new Error("NEXT_REDIRECT"))

    await expect(anfrageAktualisieren("a1", { status: "ruhend" })).rejects.toThrow("NEXT_REDIRECT")
    expect(holeAnfrage).not.toHaveBeenCalled()
    expect(aktualisiereAnfrage).not.toHaveBeenCalled()
  })

  it("lehnt einen ungültigen Status ab, ohne zu schreiben oder Treffer zu löschen", async () => {
    await expect(anfrageAktualisieren("a1", { status: "kaputt" as never })).rejects.toThrow("Ungültiger Status")
    expect(aktualisiereAnfrage).not.toHaveBeenCalled()
    expect(loescheNeueMatchesFuerAnfrage).not.toHaveBeenCalled()
  })

  it("setzt einen gültigen Status und löscht bei ruhend die neuen Treffer", async () => {
    await anfrageAktualisieren("a1", { status: "ruhend" })
    expect(holeEigenesProfil).toHaveBeenCalledTimes(1)
    expect(aktualisiereAnfrage).toHaveBeenCalledWith("a1", { status: "ruhend" })
    expect(loescheNeueMatchesFuerAnfrage).toHaveBeenCalledWith("a1")
  })

  it("lässt Änderungen ohne Status unverändert durch", async () => {
    await anfrageAktualisieren("a1", { letzter_kontakt: "2026-10-01T00:00:00.000Z" })
    expect(aktualisiereAnfrage).toHaveBeenCalledWith("a1", { letzter_kontakt: "2026-10-01T00:00:00.000Z" })
    expect(loescheNeueMatchesFuerAnfrage).not.toHaveBeenCalled()
  })
})
