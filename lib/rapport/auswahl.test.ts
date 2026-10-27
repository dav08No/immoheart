import { describe, expect, it } from "vitest"
import { nachschlagen, waehleAus } from "./auswahl"
import { BEISPIEL_JETZT, BEISPIEL_ROHDATEN } from "./beispiel-daten"
import { LEERE_ROHDATEN, type RohArchivTreffer, type RohTreffer } from "./roh"
import { rapportZeitraum } from "./zeitraum"

const z = rapportZeitraum(BEISPIEL_JETZT)

const aktiv = (teil: Partial<RohTreffer>): RohTreffer => ({
  id: "m", anfrage_id: "a", objekt_id: "o", status: "neu", score: 50,
  created_at: "2026-05-01T09:00:00Z", angeboten_am: null, abgeschlossen_am: null, ...teil,
})
const archiv = (teil: Partial<RohArchivTreffer>): RohArchivTreffer => ({
  id: "t", match_id: "m", anfrage_id: "a", objekt_id: "o", status: "neu", score: 50,
  treffer_erstellt_am: "2026-05-01T09:00:00Z", angeboten_am: null, abgeschlossen_am: null,
  archiviert_am: "2026-06-01T09:00:00Z", grund: "passt nicht mehr", ...teil,
})

describe("waehleAus", () => {
  it("liefert bei leeren Daten nur leere Listen", () => {
    const a = waehleAus(LEERE_ROHDATEN, z)
    expect(Object.values(a).every((liste) => liste.length === 0)).toBe(true)
  })

  it("trennt neue Anfragen/Objekte (erstellt) von den Tabellenzeilen (erstellt oder archiviert)", () => {
    const a = waehleAus(BEISPIEL_ROHDATEN, z)
    expect(a.neueAnfragen.map((x) => x.id)).toEqual(["a1", "a2", "a3"])
    expect(a.anfragen.map((x) => x.id)).toEqual(["a4", "a1", "a2", "a3"])
    expect(a.neueObjekte.map((x) => x.id)).toEqual(["o2", "o3"])
    expect(a.objekte.map((x) => x.id)).toEqual(["o2", "o3"])
  })

  it("zählt einen entfernten und neu gematchten Treffer nur einmal (je Paar Anfrage/Objekt)", () => {
    // Rematching: m1 wurde archiviert (Zeile gelöscht), danach entstand für dasselbe Paar m2.
    const a = waehleAus(
      {
        ...LEERE_ROHDATEN,
        treffer: [
          aktiv({ id: "m2", anfrage_id: "a1", objekt_id: "o1", status: "gesendet", created_at: "2026-05-01T09:00:00Z" }),
          aktiv({ id: "alt", anfrage_id: "a9", objekt_id: "o9", created_at: "2024-01-01T00:00:00Z" }),
        ],
        trefferArchiv: [
          archiv({ id: "t1", match_id: "m1", anfrage_id: "a1", objekt_id: "o1", treffer_erstellt_am: "2026-03-01T09:00:00Z", archiviert_am: "2026-04-01T09:00:00Z" }),
          // Paar ohne aktiven Treffer, zweimal archiviert: der jüngste Eintrag zählt.
          archiv({ id: "t2", match_id: "m3", anfrage_id: "a2", objekt_id: "o2", archiviert_am: "2026-06-01T09:00:00Z", grund: "passt nicht mehr" }),
          archiv({ id: "t3", match_id: "m4", anfrage_id: "a2", objekt_id: "o2", archiviert_am: "2026-07-01T09:00:00Z", grund: "Objekt reserviert" }),
          // Vor dem Zeitraum entstanden, im Zeitraum archiviert: Tabelle ja, Kennzahl nein.
          archiv({ id: "t4", match_id: "m5", anfrage_id: "a3", objekt_id: "o3", treffer_erstellt_am: "2024-01-01T00:00:00Z", archiviert_am: "2026-02-01T00:00:00Z" }),
        ],
      },
      z
    )
    expect(a.neueTreffer.map((t) => [t.quelle, t.matchId, t.grund])).toEqual([
      ["aktiv", "m2", null],
      ["archiv", "m4", "Objekt reserviert"],
    ])
    expect(a.trefferZeilen.map((t) => t.matchId)).toEqual(["m5", "m2", "m4"])
  })

  it("nimmt Vermittlungen nach abgeschlossen_am, auch aus dem Archiv", () => {
    const a = waehleAus(
      {
        ...LEERE_ROHDATEN,
        treffer: [
          aktiv({ id: "m1", status: "vermittelt", abgeschlossen_am: "2026-03-01T09:00:00Z" }),
          aktiv({ id: "m2", status: "vermittelt", abgeschlossen_am: "2025-01-01T09:00:00Z" }),
          aktiv({ id: "m3", status: "reserviert", abgeschlossen_am: null }),
        ],
        trefferArchiv: [
          archiv({ match_id: "m4", status: "vermittelt", abgeschlossen_am: "2026-04-01T09:00:00Z" }),
        ],
      },
      z
    )
    expect(a.vermittlungen.map((v) => v.matchId)).toEqual(["m1", "m4"])
  })

  it("lässt Angebote ohne Anfrage weg (endgültig gelöscht, R6)", () => {
    const a = waehleAus(
      {
        ...LEERE_ROHDATEN,
        angebote: [
          { match_id: null, anfrage_id: null, objekt_id: "o1", gesendet_am: "2026-05-01T09:00:00Z" },
          { match_id: null, anfrage_id: "a1", objekt_id: null, gesendet_am: "2026-05-02T09:00:00Z" },
        ],
      },
      z
    )
    expect(a.angebote.map((x) => x.anfrage_id)).toEqual(["a1"])
  })

  it("nimmt Angebote nach gesendet_am im Zeitraum", () => {
    const a = waehleAus(
      {
        ...LEERE_ROHDATEN,
        angebote: [
          { match_id: null, anfrage_id: "a1", objekt_id: null, gesendet_am: "2025-10-20T09:00:00Z" },
          { match_id: null, anfrage_id: "a1", objekt_id: null, gesendet_am: "2026-10-27T09:00:00Z" },
          { match_id: null, anfrage_id: "a1", objekt_id: null, gesendet_am: null },
        ],
      },
      z
    )
    expect(a.angebote.map((x) => x.gesendet_am)).toEqual(["2026-10-27T09:00:00Z"])
  })
})

describe("nachschlagen", () => {
  it("löst Firma über die Anfrage und Objekttitel auf, null wenn unbekannt", () => {
    const n = nachschlagen(BEISPIEL_ROHDATEN)
    expect(n.firma("a1")).toBe("Muster AG")
    expect(n.firma("a3")).toBeNull() // Anfrage ohne Firma
    expect(n.firma("weg")).toBeNull()
    expect(n.firma(null)).toBeNull()
    expect(n.objekt("o2")?.titel).toBe("Lagerhalle West")
    expect(n.anfrage("a2")?.created_at).toBe("2026-03-15T09:00:00Z")
  })
})
