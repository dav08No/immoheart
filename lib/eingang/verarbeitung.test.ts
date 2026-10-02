// Ablauf der Mail-Verarbeitung ohne echte DB/KI: Queries, Einordnung und Gemini sind
// gemockt, Zuordnung und Prompt-Bau laufen echt.
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))
vi.mock("@/lib/ki/gemini", () => ({ generiereText: vi.fn() }))
vi.mock("@/lib/ki/einordnung", () => ({ ordneEin: vi.fn() }))
vi.mock("@/lib/queries/nachrichten", () => ({ legeNachrichtAn: vi.fn() }))
vi.mock("@/lib/queries/anfragen", () => ({ aktualisiereAnfrage: vi.fn(), holeAnfrage: vi.fn() }))
vi.mock("@/lib/queries/verarbeitung", () => ({
  hatBildAnhang: vi.fn(),
  hatOffenenEntwurfZu: vi.fn(),
  holeGesendeteMitAnfrage: vi.fn(),
  holeOffeneAnfragenNachAbsender: vi.fn(),
  setzeKiFehler: vi.fn(),
  setzeKiFertig: vi.fn(),
  speichereKiErgebnis: vi.fn(),
}))
vi.mock("@/lib/queries/objektmeldung", () => ({
  holeAktiveObjekteNachEigentuemer: vi.fn(),
  holeObjektTitel: vi.fn(),
  holeAngebotFuerTreffer: vi.fn(),
}))

import { verarbeite } from "./verarbeitung"
import { generiereText } from "@/lib/ki/gemini"
import { ordneEin, type Einordnung } from "@/lib/ki/einordnung"
import { legeNachrichtAn, type NachrichtRow } from "@/lib/queries/nachrichten"
import { aktualisiereAnfrage, holeAnfrage } from "@/lib/queries/anfragen"
import {
  hatOffenenEntwurfZu,
  holeGesendeteMitAnfrage,
  setzeKiFehler,
  setzeKiFertig,
  speichereKiErgebnis,
  type GesendeteImVerlauf,
} from "@/lib/queries/verarbeitung"
import { holeAktiveObjekteNachEigentuemer, holeAngebotFuerTreffer, holeObjektTitel } from "@/lib/queries/objektmeldung"

const FELDER = { firma: null, flaeche_min: null, flaeche_max: null, ort: null, budget_pro_m2: null, bezug: null, branche: null, nutzung: null }
const OBJEKT = { titel: null, adresse: null, ort: null, flaeche: null, preis_pro_m2: null, nutzung: null, verfuegbar_ab: null, beschreibung: null }
const MELDUNG = { aenderung: "nicht_verfuegbar", zusammenfassung: "Fläche ist vermietet." } as const

function einordnung(teil: Partial<Einordnung>): Einordnung {
  return { kategorie: "sonstiges", felder: FELDER, objekt: OBJEKT, meldung: null, kein_interesse: false, ...teil }
}

function eingang(teil: Partial<NachrichtRow> = {}): NachrichtRow {
  return {
    id: "e1", von: "Eigner@Example.ch", betreff: "Fläche Altstadt", body: "Die Fläche ist weg.",
    in_reply_to: null, referenzen: null, anfrage_id: null, objekt_id: null, ...teil,
  } as NachrichtRow
}

function gesendet(teil: Partial<GesendeteImVerlauf>): GesendeteImVerlauf {
  return { message_id: "<s1>", anfrage_id: null, objekt_id: null, typ: "antwort", match_id: null, ...teil }
}

describe("verarbeite", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(generiereText).mockResolvedValue(JSON.stringify({ betreff: "B", body: "Danke" }))
    vi.mocked(hatOffenenEntwurfZu).mockResolvedValue(false)
    vi.mocked(holeGesendeteMitAnfrage).mockResolvedValue([])
    vi.mocked(holeAktiveObjekteNachEigentuemer).mockResolvedValue({ "eigner@example.ch": ["o1"] })
    vi.mocked(holeObjektTitel).mockResolvedValue("Büro Altstadt")
  })

  it("objektmeldung: ordnet per Eigentümer zu und legt genau einen Dank-Entwurf an", async () => {
    vi.mocked(ordneEin).mockResolvedValue(einordnung({ kategorie: "objektmeldung", meldung: MELDUNG }))
    await verarbeite(eingang())

    expect(speichereKiErgebnis).toHaveBeenCalledWith("e1", {
      kategorie: "objektmeldung", erkannte_felder: { meldung: MELDUNG }, objekt_id: "o1",
    })
    expect(legeNachrichtAn).toHaveBeenCalledTimes(1)
    expect(legeNachrichtAn).toHaveBeenCalledWith(expect.objectContaining({
      richtung: "entwurf", typ: "eigentuemer_info", anfrage_id: null, objekt_id: "o1", antwort_auf: "e1",
      an: "Eigner@Example.ch", betreff: "Re: Fläche Altstadt", body: "Danke",
      erkannte_felder: { abschluss: { ki_ausstehend: false, anlass: "meldung_dank" } },
    }))
    expect(vi.mocked(generiereText).mock.calls[0]?.[0]).toContain("Büro Altstadt")
    // Kein Statuswechsel: keine Anfrage angefasst, Verarbeitung fertig ohne Fehler.
    expect(aktualisiereAnfrage).not.toHaveBeenCalled()
    expect(setzeKiFertig).toHaveBeenCalledWith("e1")
    expect(setzeKiFehler).not.toHaveBeenCalled()
  })

  it("objektmeldung: Verlauf (Objekt der gesendeten Mail) schlägt Eigentümer-Adresse", async () => {
    vi.mocked(ordneEin).mockResolvedValue(einordnung({ kategorie: "objektmeldung", meldung: MELDUNG }))
    vi.mocked(holeGesendeteMitAnfrage).mockResolvedValue([gesendet({ objekt_id: "o7" })])
    await verarbeite(eingang({ in_reply_to: "<s1>" }))
    expect(speichereKiErgebnis).toHaveBeenCalledWith("e1", expect.objectContaining({ objekt_id: "o7" }))
    expect(legeNachrichtAn).toHaveBeenCalledWith(expect.objectContaining({ objekt_id: "o7" }))
  })

  it("objektmeldung ohne Zuordnung: Entwurf ohne objekt_id, objekt_id am Eingang unverändert", async () => {
    vi.mocked(ordneEin).mockResolvedValue(einordnung({ kategorie: "objektmeldung", meldung: MELDUNG }))
    vi.mocked(holeAktiveObjekteNachEigentuemer).mockResolvedValue({})
    await verarbeite(eingang())
    expect(speichereKiErgebnis).toHaveBeenCalledWith("e1", { kategorie: "objektmeldung", erkannte_felder: { meldung: MELDUNG } })
    expect(legeNachrichtAn).toHaveBeenCalledWith(expect.objectContaining({ objekt_id: null }))
  })

  // R12: ein "wieder verfügbar" betrifft fast immer ein vermietetes Objekt.
  describe("vermietete Objekte nur bei wieder_verfuegbar", () => {
    beforeEach(() => {
      // Der Eigentümer hat genau ein Objekt, und das ist vermietet.
      vi.mocked(holeAktiveObjekteNachEigentuemer).mockImplementation(
        async (status): Promise<Record<string, string[]>> => (status.includes("vermietet") ? { "eigner@example.ch": ["o9"] } : {})
      )
    })

    it("wieder_verfuegbar: ordnet das einzige vermietete Objekt des Eigentümers zu", async () => {
      const meldung = { aenderung: "wieder_verfuegbar", zusammenfassung: "Wieder frei." } as const
      vi.mocked(ordneEin).mockResolvedValue(einordnung({ kategorie: "objektmeldung", meldung }))
      await verarbeite(eingang())
      expect(holeAktiveObjekteNachEigentuemer).toHaveBeenCalledWith(["verfuegbar", "reserviert", "vermietet"])
      expect(speichereKiErgebnis).toHaveBeenCalledWith("e1", expect.objectContaining({ objekt_id: "o9" }))
    })

    it("nicht_verfuegbar: ein nur vermietetes Objekt wird nicht zugeordnet", async () => {
      vi.mocked(ordneEin).mockResolvedValue(einordnung({ kategorie: "objektmeldung", meldung: MELDUNG }))
      await verarbeite(eingang())
      expect(holeAktiveObjekteNachEigentuemer).toHaveBeenCalledWith(["verfuegbar", "reserviert"])
      expect(speichereKiErgebnis).toHaveBeenCalledWith("e1", { kategorie: "objektmeldung", erkannte_felder: { meldung: MELDUNG } })
    })
  })

  it("objektmeldung: kein zweiter Entwurf und kein KI-Aufruf, wenn schon einer offen ist", async () => {
    vi.mocked(ordneEin).mockResolvedValue(einordnung({ kategorie: "objektmeldung", meldung: MELDUNG }))
    vi.mocked(hatOffenenEntwurfZu).mockResolvedValue(true)
    await verarbeite(eingang())
    expect(legeNachrichtAn).not.toHaveBeenCalled()
    expect(generiereText).not.toHaveBeenCalled()
  })

  it("objektmeldung: ohne gültigen Absender kein KI-Aufruf", async () => {
    vi.mocked(ordneEin).mockResolvedValue(einordnung({ kategorie: "objektmeldung", meldung: MELDUNG }))
    await verarbeite(eingang({ von: "unbekannt" }))
    expect(generiereText).not.toHaveBeenCalled()
    expect(legeNachrichtAn).not.toHaveBeenCalled()
  })

  it("erzwungene Kategorie objektmeldung greift auch bei anderer KI-Einordnung", async () => {
    vi.mocked(ordneEin).mockResolvedValue(einordnung({ kategorie: "sonstiges" }))
    await verarbeite(eingang(), "objektmeldung")
    expect(legeNachrichtAn).toHaveBeenCalledWith(expect.objectContaining({ typ: "eigentuemer_info" }))
  })

  it("antwort auf ein Angebot: Objekt-Kontext im Prompt, kein_interesse und match_id gespeichert", async () => {
    vi.mocked(ordneEin).mockResolvedValue(einordnung({ kategorie: "sonstiges", kein_interesse: true }))
    vi.mocked(holeGesendeteMitAnfrage).mockResolvedValue([gesendet({ anfrage_id: "a1", typ: "angebot", match_id: "m1" })])
    vi.mocked(holeAnfrage).mockResolvedValue(null)
    vi.mocked(holeAngebotFuerTreffer).mockResolvedValue({ objektTitel: "Lager Nord", eckdaten: "300 m², Grenchen" })
    await verarbeite(eingang({ von: "firma@example.ch", in_reply_to: "<s1>" }))

    expect(speichereKiErgebnis).toHaveBeenCalledWith("e1", {
      kategorie: "antwort", erkannte_felder: { ...FELDER, kein_interesse: true, match_id: "m1" }, anfrage_id: "a1",
    })
    const prompt = vi.mocked(generiereText).mock.calls[0]?.[0] ?? ""
    expect(prompt).toContain("Lager Nord")
    expect(prompt).toContain("300 m², Grenchen")
    expect(legeNachrichtAn).toHaveBeenCalledWith(expect.objectContaining({ typ: "antwort", anfrage_id: "a1" }))
  })

  it("antwort ohne Angebot bleibt wie bisher", async () => {
    vi.mocked(ordneEin).mockResolvedValue(einordnung({ kategorie: "antwort" }))
    vi.mocked(holeGesendeteMitAnfrage).mockResolvedValue([gesendet({ anfrage_id: "a1" })])
    vi.mocked(holeAnfrage).mockResolvedValue(null)
    await verarbeite(eingang({ von: "firma@example.ch", in_reply_to: "<s1>" }))
    expect(speichereKiErgebnis).toHaveBeenCalledWith("e1", { kategorie: "antwort", erkannte_felder: FELDER, anfrage_id: "a1" })
    expect(holeAngebotFuerTreffer).not.toHaveBeenCalled()
  })
})
