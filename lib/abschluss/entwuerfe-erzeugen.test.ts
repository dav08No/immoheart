// Prüft den Ablauf Platzhalter → KI-Füllung ohne echte DB/KI: die Queries und Gemini werden
// gemockt, die Prompt-Bauer und die Planung laufen echt.
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))
vi.mock("@/lib/ki/gemini", () => ({ generiereText: vi.fn() }))
vi.mock("@/lib/abschluss/betreff", () => ({ betreffFuerAnfrage: vi.fn(async (_id: string, b: string) => `Re: ${b}`) }))
vi.mock("@/lib/queries/abschluss-entwuerfe", () => ({
  holeAbschlussKontext: vi.fn(),
  legePlatzhalterAn: vi.fn(),
  holePlatzhalterKandidaten: vi.fn(),
  fuellePlatzhalter: vi.fn(),
}))

import { erzeugeAbschlussEntwuerfe, holeAbschlussEntwuerfeNach } from "./entwuerfe-erzeugen"
import { generiereText } from "@/lib/ki/gemini"
import {
  fuellePlatzhalter,
  holeAbschlussKontext,
  holePlatzhalterKandidaten,
  legePlatzhalterAn,
  type AbschlussKontext,
  type TrefferKontext,
} from "@/lib/queries/abschluss-entwuerfe"
import type { NachrichtRow } from "@/lib/queries/nachrichten"

const eckdaten = { nutzung: null, flaeche_min: 100, flaeche_max: null, ort: "Solothurn", budget_pro_m2: null, bezug: null }
function treffer(id: string, anfrage_id: string, firmaEmail: string | null): TrefferKontext {
  return { id, anfrage_id, firma: `Firma ${id}`, firmaEmail, anfrage: eckdaten }
}
function kontext(eigentuemer_email: string | null, liste: TrefferKontext[]): AbschlussKontext {
  return { objekt: { id: "o1", titel: "Büro Altstadt", eigentuemer_email }, treffer: new Map(liste.map((t) => [t.id, t])) }
}

// legePlatzhalterAn liefert die eingefügten Zeilen mit id zurück, wie die DB.
function alsZeilen(zeilen: Partial<NachrichtRow>[]): NachrichtRow[] {
  return zeilen.map((z, i) => ({ id: `n${i + 1}`, geloescht_am: null, gesendet_am: null, ...z }) as NachrichtRow)
}

const KI_ANTWORT = JSON.stringify({ betreff: "Betreff", body: "Text" })

describe("erzeugeAbschlussEntwuerfe", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(legePlatzhalterAn).mockImplementation(async (z) => alsZeilen(z as Partial<NachrichtRow>[]))
    vi.mocked(generiereText).mockResolvedValue(KI_ANTWORT)
  })

  it("ruft die KI nicht auf und legt nichts an, wenn der Empfänger fehlt", async () => {
    vi.mocked(holeAbschlussKontext).mockResolvedValue(kontext(null, [treffer("m1", "a1", "haupt@firma.ch")]))
    const ergebnis = await erzeugeAbschlussEntwuerfe({ aktion: "reservieren", objektId: "o1", hauptMatchId: "m1", erledigte: [] })
    expect(generiereText).not.toHaveBeenCalled()
    expect(legePlatzhalterAn).not.toHaveBeenCalled()
    expect(ergebnis).toEqual({ hinweise: ["Eigentümer-E-Mail fehlt – keine Info-Mail möglich"], fehlend: 0 })
  })

  it("legt je Entwurf einen Platzhalter mit richtigem Verlauf an und füllt ihn", async () => {
    vi.mocked(holeAbschlussKontext).mockResolvedValue(
      kontext("eigner@example.ch", [treffer("m1", "a1", "haupt@firma.ch"), treffer("m2", "a2", "b@firma.ch")])
    )
    const ergebnis = await erzeugeAbschlussEntwuerfe({ aktion: "vermitteln", objektId: "o1", hauptMatchId: "m1", erledigte: ["m2"] })
    expect(ergebnis).toEqual({ hinweise: [], fehlend: 0 })

    const zeilen = vi.mocked(legePlatzhalterAn).mock.calls[0]?.[0] ?? []
    expect(zeilen.map((z) => [z.typ, z.an, z.match_id, z.anfrage_id, z.objekt_id])).toEqual([
      ["absage", "b@firma.ch", "m2", "a2", "o1"],
      ["eigentuemer_info", "eigner@example.ch", "m1", null, "o1"],
      ["bestaetigung", "haupt@firma.ch", "m1", "a1", "o1"],
    ])
    expect(zeilen.every((z) => z.richtung === "entwurf" && z.body === "" && z.betreff === "Entwurf wird erstellt…")).toBe(true)
    expect(zeilen[1]?.erkannte_felder).toEqual({ abschluss: { ki_ausstehend: true, anlass: "vermietet" } })

    expect(generiereText).toHaveBeenCalledTimes(3)
    expect(fuellePlatzhalter).toHaveBeenCalledWith("n1", {
      betreff: "Re: Betreff",
      body: "Text",
      erkannte_felder: { abschluss: { ki_ausstehend: false } },
    })
    // Eigentümer-Mail setzt keinen Firmenverlauf fort.
    expect(fuellePlatzhalter).toHaveBeenCalledWith("n2", {
      betreff: "Betreff",
      body: "Text",
      erkannte_felder: { abschluss: { ki_ausstehend: false, anlass: "vermietet" } },
    })
  })

  it("zählt einen KI-Fehler als fehlend und füllt die übrigen trotzdem", async () => {
    vi.mocked(holeAbschlussKontext).mockResolvedValue(
      kontext("eigner@example.ch", [treffer("m1", "a1", "haupt@firma.ch"), treffer("m2", "a2", "b@firma.ch")])
    )
    vi.mocked(generiereText).mockRejectedValueOnce(new Error("429 Kontingent"))
    const ergebnis = await erzeugeAbschlussEntwuerfe({ aktion: "vermitteln", objektId: "o1", hauptMatchId: "m1", erledigte: ["m2"] })
    expect(ergebnis.fehlend).toBe(1)
    expect(fuellePlatzhalter).toHaveBeenCalledTimes(2)
    expect(fuellePlatzhalter).not.toHaveBeenCalledWith("n1", expect.anything())
  })
})

describe("holeAbschlussEntwuerfeNach", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(generiereText).mockResolvedValue(KI_ANTWORT)
  })

  it("füllt nur offene Platzhalter und legt nie neue Zeilen an", async () => {
    const basis = { richtung: "entwurf" as const, objekt_id: "o1", body: "" }
    vi.mocked(holePlatzhalterKandidaten).mockResolvedValue(
      alsZeilen([
        { ...basis, typ: "absage", match_id: "m2", anfrage_id: "a2", erkannte_felder: { abschluss: { ki_ausstehend: true } } },
        { ...basis, typ: "eigentuemer_info", match_id: "m1", anfrage_id: null, body: "fertig", erkannte_felder: { abschluss: { ki_ausstehend: false } } },
      ])
    )
    vi.mocked(holeAbschlussKontext).mockResolvedValue(kontext("eigner@example.ch", [treffer("m2", "a2", "b@firma.ch")]))

    await expect(holeAbschlussEntwuerfeNach("o1")).resolves.toEqual({ hinweise: [], fehlend: 0 })
    expect(holeAbschlussKontext).toHaveBeenCalledWith("o1", ["m2"])
    expect(generiereText).toHaveBeenCalledTimes(1)
    expect(fuellePlatzhalter).toHaveBeenCalledTimes(1)
    expect(legePlatzhalterAn).not.toHaveBeenCalled()
  })

  it("macht ohne offene Platzhalter keinen KI-Aufruf", async () => {
    vi.mocked(holePlatzhalterKandidaten).mockResolvedValue([])
    await expect(holeAbschlussEntwuerfeNach("o1")).resolves.toEqual({ hinweise: [], fehlend: 0 })
    expect(generiereText).not.toHaveBeenCalled()
    expect(holeAbschlussKontext).not.toHaveBeenCalled()
  })
})
