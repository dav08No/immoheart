import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))
vi.mock("@/lib/queries/objekte", () => ({ holeObjekt: vi.fn() }))
vi.mock("@/lib/queries/firmen", () => ({
  holeFirmaPerEmail: vi.fn(async () => ({ id: "f1", kontakt_name: "Frau Muster" })),
  legeFirmaAn: vi.fn(),
  ergaenzeKontaktName: vi.fn(),
}))

import { holeObjekt } from "@/lib/queries/objekte"
import type { NachrichtRow } from "@/lib/queries/nachrichten"
import { NutzerFehler } from "@/lib/nutzer-fehler"
import { objektanfrageVorbereiten } from "./anfrage-vorbereitung"

const OBJEKT = { id: "o1", titel: "Büro", ort: "Solothurn", nutzung: "buero", flaeche: 300, preis_pro_m2: 200, archiviert_am: null }
const eingang = {
  objekt_id: "o1",
  erkannte_felder: { firma: "Muster AG", name: "Frau Muster", email: "info@muster.ch", telefon: null, nachricht: "Interesse" },
} as unknown as NachrichtRow

describe("objektanfrageVorbereiten", () => {
  beforeEach(() => vi.mocked(holeObjekt).mockReset())

  it("lehnt ein archiviertes Objekt mit NutzerFehler ab", async () => {
    vi.mocked(holeObjekt).mockResolvedValue({ ...OBJEKT, archiviert_am: "2026-10-01T09:00:00Z" } as never)
    const fehler: unknown = await objektanfrageVorbereiten(eingang).catch((e: unknown) => e)
    expect(fehler).toBeInstanceOf(NutzerFehler)
    expect((fehler as Error).message).toBe("Das angefragte Objekt ist archiviert.")
  })

  it("bereitet bei aktivem Objekt die Anfrage vor", async () => {
    vi.mocked(holeObjekt).mockResolvedValue(OBJEKT as never)
    const ergebnis = await objektanfrageVorbereiten(eingang)
    expect(ergebnis.firma).toEqual({ id: "f1", neuAngelegt: false })
  })
})
