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
  const roh = BEISPIEL_ROHDATEN
  it("nimmt den aktuellen Trefferstatus über match_id", () => {
    expect(angebotErgebnis({ match_id: "m1", anfrage_id: "a1", objekt_id: "o1", gesendet_am: null }, roh)).toBe("vermittelt")
    expect(angebotErgebnis({ match_id: "m2", anfrage_id: "a2", objekt_id: "o2", gesendet_am: null }, roh)).toBe("angeboten")
  })
  it("erkennt archivierte Treffer über Anfrage und Objekt, weil match_id dann null ist", () => {
    expect(angebotErgebnis({ match_id: null, anfrage_id: "a4", objekt_id: "o1", gesendet_am: null }, roh)).toBe("archiviert")
  })
  it("findet aktive Treffer auch ohne match_id, sonst bleibt es 'angeboten'", () => {
    expect(angebotErgebnis({ match_id: null, anfrage_id: "a1", objekt_id: "o1", gesendet_am: null }, roh)).toBe("vermittelt")
    expect(angebotErgebnis({ match_id: null, anfrage_id: null, objekt_id: null, gesendet_am: null }, roh)).toBe("angeboten")
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
