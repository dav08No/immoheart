// Repräsentative Beispieldaten für Tests und die Fixture api/tests/fixtures/modell.json.
// Nur von Tests importiert. Stichtag 27.10.2026, Zeitraum 27.10.2025 – 27.10.2026.
import type { RapportRohdaten } from "./roh"

export const BEISPIEL_JETZT = new Date("2026-10-27T10:00:00Z")

export const BEISPIEL_ROHDATEN: RapportRohdaten = {
  firmen: [
    { id: "f1", name: "Muster AG" },
    { id: "f2", name: "Beispiel GmbH" },
    { id: "f3", name: "Alt & Partner" },
  ],
  anfragen: [
    { id: "a1", firma_id: "f1", created_at: "2025-11-03T09:00:00Z", quelle: "mail", status: "vermittelt", nutzung: "buero", flaeche_min: 200, flaeche_max: 400, ort: "Solothurn", budget_pro_m2: 220, archiviert_am: null },
    { id: "a2", firma_id: "f2", created_at: "2026-03-15T09:00:00Z", quelle: "website", status: "offen", nutzung: "lager", flaeche_min: 800, flaeche_max: null, ort: "Grenchen", budget_pro_m2: null, archiviert_am: null },
    { id: "a3", firma_id: null, created_at: "2026-10-01T09:00:00Z", quelle: "manuell", status: "ruhend", nutzung: "buero", flaeche_min: null, flaeche_max: null, ort: null, budget_pro_m2: null, archiviert_am: "2026-10-20T09:00:00Z" },
    // Vor dem Zeitraum erstellt, im Zeitraum archiviert: erscheint in der Tabelle, zählt nicht als neu.
    { id: "a4", firma_id: "f3", created_at: "2025-06-01T09:00:00Z", quelle: "mail", status: "offen", nutzung: "gewerbe", flaeche_min: 100, flaeche_max: 150, ort: "Biberist", budget_pro_m2: 150, archiviert_am: "2026-01-10T09:00:00Z" },
  ],
  objekte: [
    { id: "o1", titel: "Büro am Bahnhof", ort: "Solothurn", flaeche: 300, preis_pro_m2: 210, nutzung: "buero", status: "vermietet", created_at: "2025-09-01T09:00:00Z", archiviert_am: null },
    { id: "o2", titel: "Lagerhalle West", ort: "Grenchen", flaeche: 900, preis_pro_m2: 95, nutzung: "lager", status: "verfuegbar", created_at: "2026-02-01T09:00:00Z", archiviert_am: null },
    { id: "o3", titel: "Werkstatt Süd", ort: "Zuchwil", flaeche: 250, preis_pro_m2: null, nutzung: "gewerbe", status: "verfuegbar", created_at: "2026-05-05T09:00:00Z", archiviert_am: "2026-09-01T09:00:00Z" },
  ],
  treffer: [
    { id: "m1", anfrage_id: "a1", objekt_id: "o1", status: "vermittelt", score: 92, created_at: "2025-11-04T09:00:00Z", angeboten_am: "2025-11-05T09:00:00Z", abgeschlossen_am: "2026-01-20T09:00:00Z" },
    { id: "m2", anfrage_id: "a2", objekt_id: "o2", status: "gesendet", score: 81, created_at: "2026-03-16T09:00:00Z", angeboten_am: "2026-03-18T09:00:00Z", abgeschlossen_am: null },
    { id: "m3", anfrage_id: "a2", objekt_id: "o1", status: "neu", score: 64, created_at: "2026-03-16T09:00:00Z", angeboten_am: null, abgeschlossen_am: null },
  ],
  trefferArchiv: [
    { id: "t1", match_id: "m9", anfrage_id: "a1", objekt_id: "o3", status: "neu", score: 70, treffer_erstellt_am: "2026-05-06T09:00:00Z", abgeschlossen_am: null, archiviert_am: "2026-09-01T09:00:00Z", grund: "Objekt archiviert" },
    // Vor dem Zeitraum erstellt, im Zeitraum archiviert: Tabelle ja, Kennzahl "Treffer" nein.
    { id: "t2", match_id: "m8", anfrage_id: "a4", objekt_id: "o1", status: "gesendet", score: 55, treffer_erstellt_am: "2025-07-01T09:00:00Z", abgeschlossen_am: null, archiviert_am: "2026-01-10T09:00:00Z", grund: "Anfrage archiviert" },
  ],
  angebote: [
    { match_id: "m1", anfrage_id: "a1", objekt_id: "o1", gesendet_am: "2025-11-05T09:00:00Z" },
    { match_id: "m2", anfrage_id: "a2", objekt_id: "o2", gesendet_am: "2026-03-18T09:00:00Z" },
    // match_id ist null, weil der Treffer archiviert wurde (on delete set null).
    { match_id: null, anfrage_id: "a4", objekt_id: "o1", gesendet_am: "2025-11-10T09:00:00Z" },
  ],
}
