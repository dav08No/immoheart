// Nach erfolgreichem Übergang ist der Status gespeichert: ein Fehler beim Anlegen der
// Entwürfe wird nur als Hinweis gemeldet, nie als Fehler (sonst klickt man erneut).
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("@/lib/queries/profile", () => ({ holeEigenesProfil: vi.fn().mockResolvedValue({ id: "p1" }) }))
vi.mock("@/lib/queries/abschluss", () => ({
  hebeReservierungAuf: vi.fn(),
  lehneTrefferAb: vi.fn(),
  meldeObjektNichtVerfuegbar: vi.fn(),
  reserviereTreffer: vi.fn(),
  setzeObjektWiederVerfuegbar: vi.fn(),
  vermittleTreffer: vi.fn(),
}))
vi.mock("@/lib/queries/matches", () => ({ berechneUndSpeichereMatchesFuerObjekt: vi.fn().mockResolvedValue(undefined) }))
vi.mock("@/lib/queries/nachrichten", () => ({ verknuepfeObjektMitEingang: vi.fn() }))
vi.mock("@/lib/abschluss/entwuerfe-erzeugen", () => ({ erzeugeAbschlussEntwuerfe: vi.fn(), holeAbschlussEntwuerfeNach: vi.fn() }))

import { reservierungAufheben, trefferReservieren, trefferVermitteln } from "./abschluss"
import { hebeReservierungAuf, reserviereTreffer, vermittleTreffer } from "@/lib/queries/abschluss"
import { erzeugeAbschlussEntwuerfe } from "@/lib/abschluss/entwuerfe-erzeugen"
import { berechneUndSpeichereMatchesFuerObjekt } from "@/lib/queries/matches"

const MATCH = "11111111-1111-1111-1111-111111111111"
const HINWEIS = "Status gespeichert, aber die Entwürfe konnten nicht angelegt werden."

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(reserviereTreffer).mockResolvedValue({ objekt_id: "o1" } as never)
  vi.mocked(vermittleTreffer).mockResolvedValue({ objekt_id: "o1", erledigte_treffer: [] } as never)
  vi.mocked(hebeReservierungAuf).mockResolvedValue({ objekt_id: "o1" } as never)
})

describe("Abschluss-Aktionen: Fehler beim Anlegen der Entwürfe", () => {
  it("meldet beim Reservieren nur einen Hinweis statt eines Fehlers", async () => {
    vi.mocked(erzeugeAbschlussEntwuerfe).mockRejectedValue(new Error("Kontext kaputt"))
    const konsole = vi.spyOn(console, "error").mockImplementation(() => {})

    await expect(trefferReservieren(MATCH)).resolves.toEqual({ fehler: null, hinweise: [HINWEIS] })
    expect(konsole).toHaveBeenCalled()
    konsole.mockRestore()
  })

  it("meldet auch beim Vermitteln nur den Hinweis", async () => {
    vi.mocked(erzeugeAbschlussEntwuerfe).mockRejectedValue(new Error("db down"))
    const konsole = vi.spyOn(console, "error").mockImplementation(() => {})

    await expect(trefferVermitteln(MATCH)).resolves.toEqual({ fehler: null, hinweise: [HINWEIS] })
    konsole.mockRestore()
  })

  it("rechnet beim Aufheben trotzdem neu und behält den Hinweis", async () => {
    vi.mocked(erzeugeAbschlussEntwuerfe).mockRejectedValue(new Error("db down"))
    const konsole = vi.spyOn(console, "error").mockImplementation(() => {})

    await expect(reservierungAufheben(MATCH)).resolves.toEqual({ fehler: null, hinweise: [HINWEIS] })
    expect(berechneUndSpeichereMatchesFuerObjekt).toHaveBeenCalledWith("o1")
    konsole.mockRestore()
  })

  it("gibt das normale Ergebnis weiter, wenn alles klappt", async () => {
    vi.mocked(erzeugeAbschlussEntwuerfe).mockResolvedValue({ hinweise: [], fehlend: 1 })

    await expect(trefferReservieren(MATCH)).resolves.toEqual({ fehler: null, hinweise: [], fehlend: 1 })
  })
})
