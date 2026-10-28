// Archivieren/Wiederherstellen: Profil zuerst, dann ID und Grund, dann RPC. Rematching
// nur nach dem Wiederherstellen und nur für verfügbare Objekte bzw. offene Anfragen.
import { beforeEach, describe, expect, it, vi } from "vitest"

const nachher = vi.hoisted(() => ({ rueckrufe: [] as (() => Promise<void>)[] }))
vi.mock("next/server", () => ({ after: vi.fn((f: () => Promise<void>) => void nachher.rueckrufe.push(f)) }))
vi.mock("server-only", () => ({}))
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("@/lib/queries/profile", () => ({ holeEigenesProfil: vi.fn() }))
vi.mock("@/lib/queries/archiv", () => ({
  archiviereObjekt: vi.fn(),
  archiviereAnfrage: vi.fn(),
  stelleObjektWiederHer: vi.fn(),
  stelleAnfrageWiederHer: vi.fn(),
}))
vi.mock("@/lib/queries/matches", () => ({
  berechneUndSpeichereMatchesFuerObjekt: vi.fn(),
  berechneUndSpeichereMatchesFuerAnfrage: vi.fn(),
}))

import { revalidatePath } from "next/cache"
import { after } from "next/server"
import { anfrageArchivieren, anfrageWiederherstellen, objektArchivieren, objektWiederherstellen } from "./archiv"
import { holeEigenesProfil } from "@/lib/queries/profile"
import { archiviereAnfrage, archiviereObjekt, stelleAnfrageWiederHer, stelleObjektWiederHer } from "@/lib/queries/archiv"
import { berechneUndSpeichereMatchesFuerAnfrage, berechneUndSpeichereMatchesFuerObjekt } from "@/lib/queries/matches"
import { NutzerFehler } from "@/lib/nutzer-fehler"

const ID = "22222222-2222-2222-2222-222222222222"
const REMATCH = "Treffer werden im Hintergrund neu berechnet."

async function nachherAusfuehren() {
  for (const f of nachher.rueckrufe.splice(0)) await f()
}

beforeEach(() => {
  vi.clearAllMocks()
  nachher.rueckrufe.length = 0
  vi.mocked(holeEigenesProfil).mockResolvedValue({ id: "p1" } as never)
})

describe("Archivieren", () => {
  it("prüft das Profil vor allem anderen", async () => {
    vi.mocked(holeEigenesProfil).mockRejectedValue(new Error("NEXT_REDIRECT"))
    await expect(objektArchivieren("kaputt", "x".repeat(500))).rejects.toThrow("NEXT_REDIRECT")
    await expect(anfrageWiederherstellen("kaputt")).rejects.toThrow("NEXT_REDIRECT")
    expect(archiviereObjekt).not.toHaveBeenCalled()
    expect(stelleAnfrageWiederHer).not.toHaveBeenCalled()
  })

  it("gibt bei ungültiger ID { fehler } zurück, ohne RPC", async () => {
    await expect(objektArchivieren("keine-id")).resolves.toEqual({ fehler: "Ungültige ID." })
    await expect(anfrageArchivieren("keine-id")).resolves.toEqual({ fehler: "Ungültige ID." })
    expect(archiviereObjekt).not.toHaveBeenCalled()
    expect(archiviereAnfrage).not.toHaveBeenCalled()
    expect(revalidatePath).not.toHaveBeenCalled()
  })

  it("lehnt einen zu langen Grund ohne RPC ab", async () => {
    const e = await anfrageArchivieren(ID, "x".repeat(201))
    expect(e.fehler).toMatch(/200 Zeichen/)
    expect(archiviereAnfrage).not.toHaveBeenCalled()
  })

  it("übergibt den getrimmten Grund und lädt die Pfade neu", async () => {
    await expect(objektArchivieren(ID, "  verkauft ")).resolves.toEqual({ fehler: null })
    expect(archiviereObjekt).toHaveBeenCalledWith(ID, "verkauft")
    await anfrageArchivieren(ID)
    expect(archiviereAnfrage).toHaveBeenCalledWith(ID, "")
    expect(revalidatePath).toHaveBeenCalledWith("/admin/archiv")
    expect(revalidatePath).toHaveBeenCalledWith("/objekte")
    expect(revalidatePath).toHaveBeenCalledWith("/admin", "layout")
  })

  it("gibt die DB-Meldung (P0001 als NutzerFehler) als { fehler } zurück", async () => {
    const text = "Zuerst Angebote abschliessen (z. B. ‚Nicht mehr verfügbar‘)."
    vi.mocked(archiviereObjekt).mockRejectedValue(new NutzerFehler(text))
    await expect(objektArchivieren(ID)).resolves.toEqual({ fehler: text })
    expect(revalidatePath).not.toHaveBeenCalled()
  })

  it("wirft unerwartete Fehler durch", async () => {
    vi.mocked(archiviereAnfrage).mockRejectedValue(new Error("Deadlock"))
    await expect(anfrageArchivieren(ID)).rejects.toThrow("Deadlock")
  })
})

describe("Wiederherstellen", () => {
  it("prüft Profil und ID vor der RPC", async () => {
    await expect(objektWiederherstellen("x")).resolves.toEqual({ fehler: "Ungültige ID." })
    expect(holeEigenesProfil).toHaveBeenCalled()
    expect(stelleObjektWiederHer).not.toHaveBeenCalled()
  })

  it("rechnet ein verfügbares Objekt nach der Antwort neu", async () => {
    vi.mocked(stelleObjektWiederHer).mockResolvedValue("verfuegbar")
    await expect(objektWiederherstellen(ID)).resolves.toEqual({ fehler: null, hinweise: [REMATCH] })
    expect(berechneUndSpeichereMatchesFuerObjekt).not.toHaveBeenCalled()
    await nachherAusfuehren()
    expect(berechneUndSpeichereMatchesFuerObjekt).toHaveBeenCalledWith(ID)
  })

  it.each(["reserviert", "vermietet", null] as const)("rechnet ein Objekt im Status %s nicht neu", async (status) => {
    vi.mocked(stelleObjektWiederHer).mockResolvedValue(status)
    await expect(objektWiederherstellen(ID)).resolves.toEqual({ fehler: null })
    expect(after).not.toHaveBeenCalled()
  })

  it("rechnet nur offene Anfragen neu", async () => {
    vi.mocked(stelleAnfrageWiederHer).mockResolvedValue("offen")
    await expect(anfrageWiederherstellen(ID)).resolves.toEqual({ fehler: null, hinweise: [REMATCH] })
    await nachherAusfuehren()
    expect(berechneUndSpeichereMatchesFuerAnfrage).toHaveBeenCalledWith(ID)

    vi.clearAllMocks()
    vi.mocked(stelleAnfrageWiederHer).mockResolvedValue("ruhend")
    await expect(anfrageWiederherstellen(ID)).resolves.toEqual({ fehler: null })
    expect(after).not.toHaveBeenCalled()
  })

  it("loggt einen Rematch-Fehler nur", async () => {
    vi.mocked(stelleAnfrageWiederHer).mockResolvedValue("offen")
    vi.mocked(berechneUndSpeichereMatchesFuerAnfrage).mockRejectedValue(new Error("db down"))
    const konsole = vi.spyOn(console, "error").mockImplementation(() => {})
    await anfrageWiederherstellen(ID)
    await expect(nachherAusfuehren()).resolves.toBeUndefined()
    expect(konsole).toHaveBeenCalled()
    konsole.mockRestore()
  })

  it("gibt die DB-Meldung beim Wiederherstellen zurück", async () => {
    vi.mocked(stelleObjektWiederHer).mockRejectedValue(new NutzerFehler("Das Objekt ist nicht archiviert."))
    await expect(objektWiederherstellen(ID)).resolves.toEqual({ fehler: "Das Objekt ist nicht archiviert." })
  })
})
