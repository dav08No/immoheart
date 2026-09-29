// Prüft die Lücken aus Task 5 (Ruling R2, "Lücke Empfänger"/"Lücke Nachfass"):
// Dedup-Check VOR jedem KI-Aufruf, Empfänger-Prüfung VOR jedem KI-Aufruf, und dass
// matchSenden den Match-Status nicht mehr selbst setzt. Supabase, KI und alle
// Query-Module werden gemockt ("server-only" bricht ausserhalb von Next.js).
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("@/lib/queries/profile", () => ({ holeEigenesProfil: vi.fn().mockResolvedValue({ id: "p1" }) }))
vi.mock("@/lib/ki/entwuerfe", () => ({ entwurfAngebot: vi.fn(), entwurfNachfass: vi.fn() }))
vi.mock("@/lib/abschluss/betreff", () => ({ betreffFuerAnfrage: vi.fn(async (_id: string, b: string) => b) }))
vi.mock("@/lib/queries/nachrichten", () => ({ legeNachrichtAn: vi.fn() }))
vi.mock("@/lib/queries/anfragen", () => ({
  holeAnfrage: vi.fn(),
  holeFirma: vi.fn(),
  zuAnfrageDomain: vi.fn((row: { id: string; letzter_kontakt?: string }) => ({
    id: row.id,
    letzterKontakt: new Date(row.letzter_kontakt ?? "2026-01-01T00:00:00.000Z"),
  })),
}))
vi.mock("@/lib/queries/objekte", () => ({ holeObjekt: vi.fn(), zuObjektDomain: vi.fn((row: { id: string }) => ({ id: row.id })) }))
vi.mock("@/lib/queries/versand", () => ({ holeOffenenAngebotsEntwurf: vi.fn(), holeOffenenNachfassEntwurf: vi.fn() }))
vi.mock("@/lib/supabase/server", () => ({ erstelleServerClient: vi.fn() }))

import { anfrageNachfragen, matchSenden } from "./matches"
import { entwurfAngebot, entwurfNachfass } from "@/lib/ki/entwuerfe"
import { legeNachrichtAn } from "@/lib/queries/nachrichten"
import { holeAnfrage, holeFirma } from "@/lib/queries/anfragen"
import { holeObjekt } from "@/lib/queries/objekte"
import { holeOffenenAngebotsEntwurf, holeOffenenNachfassEntwurf } from "@/lib/queries/versand"
import { erstelleServerClient } from "@/lib/supabase/server"

const MATCH_ID = "m1"
const ANFRAGE_ID = "a1"
const FIRMA_MIT_MAIL = { name: "Muster AG", kontakt_email: "kontakt@muster.ch" }

// Fake für erstelleServerClient().from("matches").select("*").eq("id", matchId).single():
// nur der eine Lesepfad, den matchSenden nach dem Dedup-Check noch braucht.
function mockMatchesSelect(row: Record<string, unknown> | null) {
  vi.mocked(erstelleServerClient).mockResolvedValue({
    from: () => ({ select: () => ({ eq: () => ({ single: async () => ({ data: row, error: null }) }) }) }),
  } as unknown as Awaited<ReturnType<typeof erstelleServerClient>>)
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe("matchSenden", () => {
  it("liefert die id eines offenen Angebots-Entwurfs zurück, ohne KI-Aufruf oder DB-Zugriff auf matches", async () => {
    vi.mocked(holeOffenenAngebotsEntwurf).mockResolvedValue({ id: "entwurf-bestehend" } as never)

    await expect(matchSenden(MATCH_ID)).resolves.toEqual({ entwurfId: "entwurf-bestehend" })
    expect(entwurfAngebot).not.toHaveBeenCalled()
    expect(erstelleServerClient).not.toHaveBeenCalled()
  })

  it("wirft 'bereits bearbeitet', wenn kein offener Entwurf existiert, der Status aber nicht mehr 'neu' ist", async () => {
    vi.mocked(holeOffenenAngebotsEntwurf).mockResolvedValue(null)
    mockMatchesSelect({ status: "gesendet", anfrage_id: ANFRAGE_ID, objekt_id: "o1", kriterien: [], hinweis: "" })

    await expect(matchSenden(MATCH_ID)).rejects.toThrow("Dieses Match wurde bereits bearbeitet.")
    expect(entwurfAngebot).not.toHaveBeenCalled()
  })

  it("prüft den Empfänger vor dem KI-Aufruf und legt ohne Adresse keinen Entwurf an", async () => {
    vi.mocked(holeOffenenAngebotsEntwurf).mockResolvedValue(null)
    mockMatchesSelect({ status: "neu", anfrage_id: ANFRAGE_ID, objekt_id: "o1", kriterien: [], hinweis: "" })
    vi.mocked(holeAnfrage).mockResolvedValue({ id: ANFRAGE_ID, firma_id: null } as never)
    vi.mocked(holeObjekt).mockResolvedValue({ id: "o1" } as never)

    await expect(matchSenden(MATCH_ID)).rejects.toThrow("kein Empfänger für den Versand vorhanden")
    expect(entwurfAngebot).not.toHaveBeenCalled()
    expect(legeNachrichtAn).not.toHaveBeenCalled()
  })

  it("legt den Entwurf an und lässt den Match-Status unverändert (kein zweiter DB-Zugriff auf matches)", async () => {
    vi.mocked(holeOffenenAngebotsEntwurf).mockResolvedValue(null)
    mockMatchesSelect({ status: "neu", anfrage_id: ANFRAGE_ID, objekt_id: "o1", kriterien: [], hinweis: "gut" })
    vi.mocked(holeAnfrage).mockResolvedValue({ id: ANFRAGE_ID, firma_id: "f1" } as never)
    vi.mocked(holeFirma).mockResolvedValue(FIRMA_MIT_MAIL)
    vi.mocked(holeObjekt).mockResolvedValue({ id: "o1" } as never)
    vi.mocked(entwurfAngebot).mockResolvedValue({ betreff: "Betreff", body: "Text" })
    vi.mocked(legeNachrichtAn).mockResolvedValue({ id: "entwurf-neu" } as never)

    await expect(matchSenden(MATCH_ID)).resolves.toEqual({ entwurfId: "entwurf-neu" })
    expect(legeNachrichtAn).toHaveBeenCalledWith(expect.objectContaining({ an: "kontakt@muster.ch", typ: "angebot", match_id: MATCH_ID }))
    // erstelleServerClient wird nur für das eine Lesen aufgerufen -- kein zweiter
    // Aufruf für ein Status-Update, matchSenden setzt den Status nicht mehr selbst.
    expect(erstelleServerClient).toHaveBeenCalledTimes(1)
  })
})

describe("anfrageNachfragen", () => {
  it("liefert die id eines offenen Nachfass-Entwurfs zurück, ohne KI-Aufruf", async () => {
    vi.mocked(holeOffenenNachfassEntwurf).mockResolvedValue({ id: "nachfass-bestehend" } as never)

    await expect(anfrageNachfragen(ANFRAGE_ID)).resolves.toEqual({ entwurfId: "nachfass-bestehend" })
    expect(entwurfNachfass).not.toHaveBeenCalled()
    expect(holeAnfrage).not.toHaveBeenCalled()
  })

  it("prüft den Empfänger vor dem KI-Aufruf", async () => {
    vi.mocked(holeOffenenNachfassEntwurf).mockResolvedValue(null)
    vi.mocked(holeAnfrage).mockResolvedValue({ id: ANFRAGE_ID, firma_id: "f1" } as never)
    vi.mocked(holeFirma).mockResolvedValue({ name: "Muster AG", kontakt_email: null })

    await expect(anfrageNachfragen(ANFRAGE_ID)).rejects.toThrow("kein Empfänger für den Versand vorhanden")
    expect(entwurfNachfass).not.toHaveBeenCalled()
  })
})
