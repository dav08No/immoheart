// Eigentümer-Adresse aus der Herkunftsmail nur bei einem Objektangebot: sonst bekäme
// z.B. eine suchende Firma Eigentümer-Mails. Queries gemockt, Prüfregeln echt.
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("@/lib/queries/profile", () => ({ holeEigenesProfil: vi.fn().mockResolvedValue({ id: "p1" }) }))
vi.mock("@/lib/queries/objekte", () => ({ legeObjektAn: vi.fn(), aktualisiereObjekt: vi.fn() }))
vi.mock("@/lib/queries/nachrichten", () => ({ holeNachricht: vi.fn(), verknuepfeObjektMitEingang: vi.fn() }))
vi.mock("@/lib/queries/matches", () => ({ berechneUndSpeichereMatchesFuerObjekt: vi.fn() }))

import { objektAktualisieren, objektAnlegen } from "./objekte"
import { aktualisiereObjekt, legeObjektAn } from "@/lib/queries/objekte"
import { berechneUndSpeichereMatchesFuerObjekt } from "@/lib/queries/matches"
import { holeNachricht, type NachrichtRow } from "@/lib/queries/nachrichten"
import type { Database } from "@/types/database"

const HERKUNFT_ID = "11111111-1111-1111-1111-111111111111"
const OBJEKT: Database["public"]["Tables"]["objekte"]["Insert"] = {
  titel: "Büro", adresse: "Weg 1", ort: "Solothurn", flaeche: 100, nutzung: "buero",
  verfuegbar_ab: "2026-10-01", eigentuemer: "Eigner", eigentuemer_email: null,
}

function herkunft(teil: Partial<NachrichtRow>): NachrichtRow {
  return { id: HERKUNFT_ID, richtung: "eingang", kategorie: "objektangebot", geloescht_am: null, von: "Eigner@Example.ch", ...teil } as NachrichtRow
}

function gespeicherteEmail(): string | null | undefined {
  return vi.mocked(legeObjektAn).mock.calls[0]?.[0].eigentuemer_email
}

describe("objektAnlegen: Eigentümer-E-Mail aus Herkunftsmail", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(legeObjektAn).mockResolvedValue({ id: "o1" } as Database["public"]["Tables"]["objekte"]["Row"])
  })

  it("übernimmt den Absender eines Objektangebots kleingeschrieben", async () => {
    vi.mocked(holeNachricht).mockResolvedValue(herkunft({}))
    await objektAnlegen(OBJEKT, HERKUNFT_ID)
    expect(gespeicherteEmail()).toBe("eigner@example.ch")
  })

  it("eingetragene Adresse hat Vorrang", async () => {
    vi.mocked(holeNachricht).mockResolvedValue(herkunft({}))
    await objektAnlegen({ ...OBJEKT, eigentuemer_email: "Andere@Example.ch" }, HERKUNFT_ID)
    expect(gespeicherteEmail()).toBe("andere@example.ch")
  })

  it("übernimmt nichts aus einer Suchanfrage", async () => {
    vi.mocked(holeNachricht).mockResolvedValue(herkunft({ kategorie: "suchanfrage", von: "firma@example.ch" }))
    await objektAnlegen(OBJEKT, HERKUNFT_ID)
    expect(gespeicherteEmail()).toBeNull()
  })

  it("übernimmt nichts aus einer gelöschten Mail", async () => {
    vi.mocked(holeNachricht).mockResolvedValue(herkunft({ geloescht_am: "2026-09-29T10:00:00Z" }))
    await objektAnlegen(OBJEKT, HERKUNFT_ID)
    expect(gespeicherteEmail()).toBeNull()
  })

  it("lehnt eine ungültige eingetragene Adresse ab", async () => {
    await expect(objektAnlegen({ ...OBJEKT, eigentuemer_email: "kein-mail" })).rejects.toThrow("Eigentümer-E-Mail")
    expect(legeObjektAn).not.toHaveBeenCalled()
  })
})

// Spec §3: Der Status wechselt nur über die Abschluss-Aktionen, nie über das Formular.
describe("Objekt-Status nicht über das Formular", () => {
  const OBJEKT_ID = "22222222-2222-2222-2222-222222222222"

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(legeObjektAn).mockResolvedValue({ id: "o1" } as Database["public"]["Tables"]["objekte"]["Row"])
  })

  it("objektAktualisieren lehnt status ab und speichert nichts", async () => {
    const aenderung = { titel: "Neu", status: "vermietet" } as Parameters<typeof objektAktualisieren>[1]
    await expect(objektAktualisieren(OBJEKT_ID, aenderung)).rejects.toThrow("Abschluss-Aktionen")
    expect(aktualisiereObjekt).not.toHaveBeenCalled()
    expect(berechneUndSpeichereMatchesFuerObjekt).not.toHaveBeenCalled()
  })

  it("objektAktualisieren rematcht weiterhin bei suchrelevanten Feldern", async () => {
    await objektAktualisieren(OBJEKT_ID, { flaeche: 120 })
    expect(aktualisiereObjekt).toHaveBeenCalledWith(OBJEKT_ID, { flaeche: 120 })
    expect(berechneUndSpeichereMatchesFuerObjekt).toHaveBeenCalledWith(OBJEKT_ID)
  })

  it("objektAktualisieren rematcht nicht bei reinem Titel-Update", async () => {
    await objektAktualisieren(OBJEKT_ID, { titel: "Anders" })
    expect(berechneUndSpeichereMatchesFuerObjekt).not.toHaveBeenCalled()
  })

  it("objektAnlegen ignoriert einen mitgeschickten Status (DB-Default verfuegbar)", async () => {
    await objektAnlegen({ ...OBJEKT, status: "vermietet" })
    expect(vi.mocked(legeObjektAn).mock.calls[0]?.[0]).not.toHaveProperty("status")
  })
})
