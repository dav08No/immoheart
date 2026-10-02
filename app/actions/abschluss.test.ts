// Ruling R15: die Aktion antwortet nach Übergang + Platzhaltern; KI-Füllung und Rematching
// laufen in after(). Fehler beim Anlegen sind nur Hinweise, Fehler danach nur Log-Einträge.
import { beforeEach, describe, expect, it, vi } from "vitest"

// after() sammelt die Rückrufe; die Tests führen sie gezielt aus.
const nachher = vi.hoisted(() => ({ rueckrufe: [] as (() => Promise<void>)[] }))
vi.mock("next/server", () => ({ after: vi.fn((f: () => Promise<void>) => void nachher.rueckrufe.push(f)) }))
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

import { after } from "next/server"
import { objektWiederVerfuegbar, reservierungAufheben, trefferReservieren, trefferVermitteln } from "./abschluss"
import { hebeReservierungAuf, reserviereTreffer, setzeObjektWiederVerfuegbar, vermittleTreffer } from "@/lib/queries/abschluss"
import { erzeugeAbschlussEntwuerfe } from "@/lib/abschluss/entwuerfe-erzeugen"
import { berechneUndSpeichereMatchesFuerObjekt } from "@/lib/queries/matches"

const MATCH = "11111111-1111-1111-1111-111111111111"
const OBJEKT = "22222222-2222-2222-2222-222222222222"
const HINWEIS = "Status gespeichert, aber die Entwürfe konnten nicht angelegt werden."
const REMATCH = "Treffer werden im Hintergrund neu berechnet."

async function nachherAusfuehren() {
  for (const f of nachher.rueckrufe.splice(0)) await f()
}

beforeEach(() => {
  vi.clearAllMocks()
  nachher.rueckrufe.length = 0
  vi.mocked(reserviereTreffer).mockResolvedValue({ objekt_id: "o1" } as never)
  vi.mocked(vermittleTreffer).mockResolvedValue({ objekt_id: "o1", erledigte_treffer: [] } as never)
  vi.mocked(hebeReservierungAuf).mockResolvedValue({ objekt_id: "o1" } as never)
  vi.mocked(berechneUndSpeichereMatchesFuerObjekt).mockResolvedValue(undefined)
})

describe("Abschluss-Aktionen: Fehler beim Anlegen der Entwürfe", () => {
  it("meldet beim Reservieren nur einen Hinweis statt eines Fehlers", async () => {
    vi.mocked(erzeugeAbschlussEntwuerfe).mockRejectedValue(new Error("Kontext kaputt"))
    const konsole = vi.spyOn(console, "error").mockImplementation(() => {})

    await expect(trefferReservieren(MATCH)).resolves.toEqual({ fehler: null, hinweise: [HINWEIS] })
    expect(konsole).toHaveBeenCalled()
    expect(after).not.toHaveBeenCalled()
    konsole.mockRestore()
  })

  it("meldet auch beim Vermitteln nur den Hinweis", async () => {
    vi.mocked(erzeugeAbschlussEntwuerfe).mockRejectedValue(new Error("db down"))
    const konsole = vi.spyOn(console, "error").mockImplementation(() => {})

    await expect(trefferVermitteln(MATCH)).resolves.toEqual({ fehler: null, hinweise: [HINWEIS] })
    konsole.mockRestore()
  })

  it("rechnet beim Aufheben trotzdem neu (nach der Antwort) und behält den Hinweis", async () => {
    vi.mocked(erzeugeAbschlussEntwuerfe).mockRejectedValue(new Error("db down"))
    const konsole = vi.spyOn(console, "error").mockImplementation(() => {})

    await expect(reservierungAufheben(MATCH)).resolves.toEqual({ fehler: null, hinweise: [HINWEIS, REMATCH] })
    expect(berechneUndSpeichereMatchesFuerObjekt).not.toHaveBeenCalled()
    await nachherAusfuehren()
    expect(berechneUndSpeichereMatchesFuerObjekt).toHaveBeenCalledWith("o1")
    konsole.mockRestore()
  })
})

describe("Abschluss-Aktionen: KI-Füllung im Hintergrund (Ruling R15)", () => {
  it("antwortet ohne auf die KI zu warten und meldet die angelegten Platzhalter", async () => {
    const fuellen = vi.fn().mockResolvedValue(0)
    vi.mocked(erzeugeAbschlussEntwuerfe).mockResolvedValue({ hinweise: [], angelegt: 3, fuellen })

    await expect(trefferVermitteln(MATCH)).resolves.toEqual({ fehler: null, hinweise: [], fehlend: 3, hintergrund: true })
    expect(fuellen).not.toHaveBeenCalled()
    expect(after).toHaveBeenCalledTimes(1)
    await nachherAusfuehren()
    expect(fuellen).toHaveBeenCalledTimes(1)
  })

  it("plant ohne Platzhalter keine Hintergrundarbeit", async () => {
    vi.mocked(erzeugeAbschlussEntwuerfe).mockResolvedValue({ hinweise: ["Eigentümer fehlt"], angelegt: 0, fuellen: vi.fn() })

    await expect(trefferReservieren(MATCH)).resolves.toEqual({ fehler: null, hinweise: ["Eigentümer fehlt"] })
    expect(after).not.toHaveBeenCalled()
  })

  it("fängt Fehler der Hintergrundschritte ab und loggt sie", async () => {
    vi.mocked(erzeugeAbschlussEntwuerfe).mockResolvedValue({ hinweise: [], angelegt: 1, fuellen: vi.fn().mockRejectedValue(new Error("Gemini down")) })
    vi.mocked(berechneUndSpeichereMatchesFuerObjekt).mockRejectedValue(new Error("Rematch kaputt"))
    const konsole = vi.spyOn(console, "error").mockImplementation(() => {})

    await expect(reservierungAufheben(MATCH)).resolves.toMatchObject({ fehler: null, fehlend: 1, hintergrund: true })
    expect(after).toHaveBeenCalledTimes(2)
    await expect(nachherAusfuehren()).resolves.toBeUndefined()
    expect(konsole).toHaveBeenCalledTimes(2)
    konsole.mockRestore()
  })

  it("rechnet nach „wieder verfügbar“ erst nach der Antwort neu", async () => {
    vi.mocked(setzeObjektWiederVerfuegbar).mockResolvedValue(undefined as never)

    await expect(objektWiederVerfuegbar(OBJEKT)).resolves.toEqual({ fehler: null, hinweise: [REMATCH] })
    expect(berechneUndSpeichereMatchesFuerObjekt).not.toHaveBeenCalled()
    await nachherAusfuehren()
    expect(berechneUndSpeichereMatchesFuerObjekt).toHaveBeenCalledWith(OBJEKT)
  })
})
