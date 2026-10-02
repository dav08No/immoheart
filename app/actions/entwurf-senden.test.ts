// Prüft den neuen Task-5-Schritt in entwurfSenden: nach erfolgreichem Versand eines
// Angebots-Entwurfs (match_id gesetzt) markiert markiereMatchAngeboten den Treffer als
// angeboten, best-effort wie letzter_kontakt -- ein Fehler dabei darf das Versand-
// Ergebnis nicht verändern. Alle Query-Module und der SMTP-Versand werden gemockt.
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { Database } from "@/types/database"

type NachrichtRow = Database["public"]["Tables"]["nachrichten"]["Row"]

vi.mock("server-only", () => ({}))
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("@/lib/queries/profile", () => ({ holeEigenesProfil: vi.fn().mockResolvedValue({ id: "p1" }) }))
vi.mock("@/lib/queries/nachrichten", () => ({ holeNachricht: vi.fn(), aktualisiereNachricht: vi.fn() }))
vi.mock("@/lib/queries/versand", () => ({
  holeGesendeteIdsFuerAnfrage: vi.fn().mockResolvedValue([]),
  markiereGesendet: vi.fn().mockResolvedValue(undefined),
  reserviereEntwurf: vi.fn(),
  gibReservierungFrei: vi.fn().mockResolvedValue(undefined),
}))
vi.mock("@/lib/queries/anfragen", () => ({ aktualisiereAnfrage: vi.fn().mockResolvedValue(undefined) }))
vi.mock("@/lib/queries/matches", () => ({ markiereMatchAngeboten: vi.fn().mockResolvedValue(undefined) }))
vi.mock("@/lib/mail/versand", () => ({ sendeMail: vi.fn() }))
vi.mock("@/lib/queries/angebot-status", () => ({ holeAngebotsStatus: vi.fn() }))

import { entwurfSenden } from "./entwurf-senden"
import { holeNachricht } from "@/lib/queries/nachrichten"
import { reserviereEntwurf } from "@/lib/queries/versand"
import { markiereMatchAngeboten } from "@/lib/queries/matches"
import { sendeMail } from "@/lib/mail/versand"
import { holeAngebotsStatus } from "@/lib/queries/angebot-status"
import { ANGEBOT_GESPERRT } from "@/lib/entwurf-status"

const ID = "11111111-1111-1111-1111-111111111111"

function zeile(felder: Partial<NachrichtRow> & { id: string }): NachrichtRow {
  return {
    an: "kontakt@muster.ch",
    anfrage_id: "a1",
    anhaenge: [],
    antwort_auf: null,
    betreff: "Betreff",
    body: "Text",
    created_at: "2026-01-01T00:00:00.000Z",
    empfangen_am: null,
    erkannte_felder: null,
    gelesen: true,
    geloescht_am: null,
    gesendet_am: null,
    in_reply_to: null,
    kategorie: null,
    ki_fehler: null,
    ki_gestartet_am: null,
    ki_status: null,
    match_id: null,
    message_id: null,
    objekt_id: null,
    quelle: "admin",
    referenzen: null,
    richtung: "entwurf",
    typ: "angebot",
    versand_fehler: null,
    von: "immoheart@example.ch",
    ...felder,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(holeNachricht).mockResolvedValue(null)
  vi.mocked(reserviereEntwurf).mockResolvedValue(null)
  vi.mocked(sendeMail).mockResolvedValue({ messageId: "msg-1" })
  vi.mocked(holeAngebotsStatus).mockResolvedValue({ matchStatus: "neu", objektStatus: "verfuegbar" })
  vi.stubEnv("GMAIL_USER", "immoheart@example.ch")
})

describe("entwurfSenden -- Treffer als angeboten markieren", () => {
  it("markiert den verknüpften Treffer als angeboten, wenn der Entwurf eine match_id hat", async () => {
    const entwurf = zeile({ id: ID, match_id: "m1", anfrage_id: "a1" })
    vi.mocked(holeNachricht).mockResolvedValue(entwurf)
    vi.mocked(reserviereEntwurf).mockResolvedValue(entwurf)

    await expect(entwurfSenden(ID)).resolves.toEqual({ fehler: null })
    expect(markiereMatchAngeboten).toHaveBeenCalledWith("m1")
    expect(sendeMail).toHaveBeenCalledTimes(1)
  })

  it("bricht das Versand-Ergebnis nicht, wenn markiereMatchAngeboten fehlschlägt", async () => {
    const entwurf = zeile({ id: ID, match_id: "m1", anfrage_id: "a1" })
    vi.mocked(holeNachricht).mockResolvedValue(entwurf)
    vi.mocked(reserviereEntwurf).mockResolvedValue(entwurf)
    vi.mocked(markiereMatchAngeboten).mockRejectedValueOnce(new Error("db down"))
    const konsole = vi.spyOn(console, "error").mockImplementation(() => {})

    // Die Mail ist bereits versendet (sendeMail + markiereGesendet erfolgreich) -- ein
    // reiner Fehler beim Komfort-Update matches darf das nicht zu einem Nutzer-Fehler
    // machen, sonst wirkt es, als wäre die Mail gar nicht rausgegangen.
    await expect(entwurfSenden(ID)).resolves.toEqual({ fehler: null })
    expect(sendeMail).toHaveBeenCalledTimes(1)
    konsole.mockRestore()
  })

  it("ruft markiereMatchAngeboten nicht auf, wenn der Entwurf keine match_id hat (z.B. Nachfass)", async () => {
    const entwurf = zeile({ id: ID, match_id: null, anfrage_id: "a1", typ: "nachfass" })
    vi.mocked(holeNachricht).mockResolvedValue(entwurf)
    vi.mocked(reserviereEntwurf).mockResolvedValue(entwurf)

    await expect(entwurfSenden(ID)).resolves.toEqual({ fehler: null })
    expect(markiereMatchAngeboten).not.toHaveBeenCalled()
  })
})

describe("entwurfSenden -- gesperrte Angebote (Live-Befund L1)", () => {
  it("lehnt einen Angebots-Entwurf ab, dessen Treffer gelöscht wurde, ohne zu reservieren oder zu senden", async () => {
    vi.mocked(holeNachricht).mockResolvedValue(zeile({ id: ID, typ: "angebot", match_id: null }))

    await expect(entwurfSenden(ID)).resolves.toEqual({ fehler: ANGEBOT_GESPERRT })
    expect(reserviereEntwurf).not.toHaveBeenCalled()
    expect(sendeMail).not.toHaveBeenCalled()
  })

  it("lehnt ein Angebot ab, wenn der Treffer erledigt und das Objekt vermietet ist", async () => {
    vi.mocked(holeNachricht).mockResolvedValue(zeile({ id: ID, typ: "angebot", match_id: "m1" }))
    vi.mocked(holeAngebotsStatus).mockResolvedValue({ matchStatus: "erledigt", objektStatus: "vermietet" })

    await expect(entwurfSenden(ID)).resolves.toEqual({ fehler: ANGEBOT_GESPERRT })
    expect(holeAngebotsStatus).toHaveBeenCalledWith("m1")
    expect(reserviereEntwurf).not.toHaveBeenCalled()
    expect(sendeMail).not.toHaveBeenCalled()
  })

  it("lehnt ein Angebot für ein reserviertes Objekt ab, auch wenn der Treffer noch neu ist", async () => {
    vi.mocked(holeNachricht).mockResolvedValue(zeile({ id: ID, typ: "angebot", match_id: "m1" }))
    vi.mocked(holeAngebotsStatus).mockResolvedValue({ matchStatus: "neu", objektStatus: "reserviert" })

    await expect(entwurfSenden(ID)).resolves.toEqual({ fehler: ANGEBOT_GESPERRT })
    expect(reserviereEntwurf).not.toHaveBeenCalled()
  })

  it("prüft den Status bei anderen Typen gar nicht", async () => {
    const entwurf = zeile({ id: ID, typ: "absage", match_id: "m1" })
    vi.mocked(holeNachricht).mockResolvedValue(entwurf)
    vi.mocked(reserviereEntwurf).mockResolvedValue(entwurf)

    await expect(entwurfSenden(ID)).resolves.toEqual({ fehler: null })
    expect(holeAngebotsStatus).not.toHaveBeenCalled()
  })
})
