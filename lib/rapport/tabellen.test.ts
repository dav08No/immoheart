import { describe, expect, it } from "vitest"
import { nachschlagen, waehleAus } from "./auswahl"
import { BEISPIEL_JETZT, BEISPIEL_ROHDATEN } from "./beispiel-daten"
import { LEERE_ROHDATEN } from "./roh"
import { angebotErgebnis, baueTabellen, ohneEmail } from "./tabellen"
import { rapportZeitraum } from "./zeitraum"

const z = rapportZeitraum(BEISPIEL_JETZT)
const tabellen = (roh = BEISPIEL_ROHDATEN) => baueTabellen(waehleAus(roh, z), roh, nachschlagen(roh))

describe("ohneEmail", () => {
  it("entfernt E-Mail-Adressen aus Freitext", () => {
    expect(ohneEmail("Kontakt max@muster.ch bitte")).toBe("Kontakt [E-Mail entfernt] bitte")
    expect(ohneEmail("Muster AG")).toBe("Muster AG")
  })
})

describe("angebotErgebnis", () => {
  const ergebnis = angebotErgebnis(BEISPIEL_ROHDATEN)
  const mail = (match_id: string | null, anfrage_id: string | null, objekt_id: string | null, gesendet_am: string) =>
    ergebnis({ match_id, anfrage_id, objekt_id, gesendet_am })

  it("nimmt den aktuellen Trefferstatus über match_id", () => {
    expect(mail("m1", "a1", "o1", "2025-11-05T09:00:00Z")).toBe("vermittelt")
    expect(mail("m2", "a2", "o2", "2026-03-18T09:00:00Z")).toBe("angeboten")
  })
  it("erkennt archivierte Treffer über Anfrage und Objekt, weil match_id dann null ist", () => {
    expect(mail(null, "a4", "o1", "2025-11-10T09:00:00Z")).toBe("archiviert")
  })
  it("findet aktive Treffer auch ohne match_id, sonst bleibt es 'angeboten'", () => {
    expect(mail(null, "a1", "o1", "2025-11-06T09:00:00Z")).toBe("vermittelt")
    expect(mail(null, "a3", "o2", "2026-10-02T09:00:00Z")).toBe("angeboten")
  })
  it("zeigt bei einem alten Angebot den Stand seiner eigenen Episode, nicht den des Rematchings", () => {
    // Episode 1 (a1/o2) wurde nach dem Angebot archiviert, danach entstand Episode 2 und wurde vermittelt.
    const e = angebotErgebnis({
      treffer: [{ id: "neu", anfrage_id: "a1", objekt_id: "o2", status: "vermittelt", score: 90, created_at: "2026-06-01T09:00:00Z", angeboten_am: "2026-06-02T09:00:00Z", abgeschlossen_am: "2026-07-01T09:00:00Z" }],
      trefferArchiv: [{ id: "t", match_id: "alt", anfrage_id: "a1", objekt_id: "o2", status: "gesendet", score: 70, treffer_erstellt_am: "2026-03-01T09:00:00Z", angeboten_am: "2026-03-02T09:00:00Z", abgeschlossen_am: null, archiviert_am: "2026-04-01T09:00:00Z", grund: "passt nicht mehr" }],
    })
    expect(e({ match_id: null, anfrage_id: "a1", objekt_id: "o2", gesendet_am: "2026-03-02T09:00:00Z" })).toBe("archiviert")
    expect(e({ match_id: "neu", anfrage_id: "a1", objekt_id: "o2", gesendet_am: "2026-06-02T09:00:00Z" })).toBe("vermittelt")
  })
})

describe("baueTabellen", () => {
  it("liefert bei leeren Daten 5 Tabellen mit Köpfen und ohne Zeilen", () => {
    const t = tabellen(LEERE_ROHDATEN)
    expect(Object.keys(t)).toEqual(["vermittlungen", "angebote", "treffer", "anfragen", "objekte"])
    for (const tabelle of Object.values(t)) {
      expect(tabelle.spalten.length).toBeGreaterThan(0)
      expect(tabelle.zeilen).toEqual([])
    }
  })

  // Datenschutz: jede neue Spalte muss hier bewusst ergänzt werden.
  it("hat genau die erlaubten Spalten je Tabelle", () => {
    const schluessel = Object.fromEntries(Object.entries(tabellen(LEERE_ROHDATEN)).map(([k, t]) => [k, t.spalten.map((s) => s.schluessel)]))
    expect(schluessel).toEqual({
      vermittlungen: ["datum", "firma", "objekt", "flaeche", "preisProM2", "tageBisAbschluss"],
      angebote: ["gesendet", "firma", "objekt", "ergebnis"],
      treffer: ["firma", "objekt", "score", "status", "erstellt", "archiviertAm", "grund"],
      anfragen: ["eingang", "firma", "nutzung", "flaecheMin", "flaecheMax", "ort", "budgetProM2", "quelle", "status", "archiviert"],
      objekte: ["erfasst", "titel", "ort", "flaeche", "preisProM2", "nutzung", "status", "angebote", "archiviert"],
    })
  })

  it("hat in jeder Zeile genau die Spaltenschlüssel", () => {
    for (const tabelle of Object.values(tabellen())) {
      const schluessel = tabelle.spalten.map((s) => s.schluessel)
      for (const zeile of tabelle.zeilen) expect(Object.keys(zeile)).toEqual(schluessel)
    }
  })

  it("füllt Vermittlungen mit Objektdaten und Tagen bis Abschluss", () => {
    expect(tabellen().vermittlungen.zeilen).toEqual([
      { datum: "2026-01-20", firma: "Muster AG", objekt: "Büro am Bahnhof", flaeche: 300, preisProM2: 210, tageBisAbschluss: 78 },
    ])
  })

  it("zeigt Angebote mit Ergebnis", () => {
    expect(tabellen().angebote.zeilen.map((r) => [r.gesendet, r.firma, r.ergebnis])).toEqual([
      ["2025-11-05", "Muster AG", "vermittelt"],
      ["2025-11-10", "Alt & Partner", "archiviert"],
      ["2026-03-18", "Beispiel GmbH", "angeboten"],
    ])
  })

  it("zeigt aktive und archivierte Treffer mit Grund", () => {
    const zeilen = tabellen().treffer.zeilen
    expect(zeilen).toHaveLength(5)
    expect(zeilen[0]).toEqual({
      firma: "Alt & Partner", objekt: "Büro am Bahnhof", score: 55, status: "Angeboten",
      erstellt: "2025-07-01", archiviertAm: "2026-01-10", grund: "Anfrage archiviert",
    })
    expect(zeilen.at(-1)).toMatchObject({ objekt: "Werkstatt Süd", status: "Neu", grund: "Objekt archiviert" })
  })

  it("zeigt Anfragen und Objekte mit Labels und Angebotszahl", () => {
    const t = tabellen()
    expect(t.anfragen.zeilen[0]).toEqual({
      eingang: "2025-06-01", firma: "Alt & Partner", nutzung: "Gewerbe", flaecheMin: 100, flaecheMax: 150,
      ort: "Biberist", budgetProM2: 150, quelle: "Mail", status: "Offen", archiviert: "2026-01-10",
    })
    expect(t.objekte.zeilen.map((r) => [r.titel, r.status, r.angebote, r.archiviert])).toEqual([
      ["Lagerhalle West", "Verfügbar", 1, null],
      ["Werkstatt Süd", "Verfügbar", 0, "2026-09-01"],
    ])
  })
})
