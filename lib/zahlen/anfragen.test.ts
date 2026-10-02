import { describe, expect, it } from "vitest"
import { abschluesseJeAnfrage, anfragenProMonat, tageBisAbschluss, tageBisErstangebot, topObjekte, vermittlungsquote } from "./anfragen"

describe("anfragenProMonat", () => {
  it("liefert Leerwerte für jeden Monat bei leerer Eingabe", () => {
    expect(anfragenProMonat([], new Date("2026-09-15T10:00:00Z"), 2)).toEqual([
      { monat: "2026-08", label: "Aug 26", mail: 0, website: 0, manuell: 0 },
      { monat: "2026-09", label: "Sep 26", mail: 0, website: 0, manuell: 0 },
    ])
  })

  it("zählt nach Quelle und ignoriert unbekannte Quellen sowie Einträge ausserhalb des Zeitraums", () => {
    const ergebnis = anfragenProMonat(
      [
        { created_at: "2026-09-01T10:00:00Z", quelle: "mail" },
        { created_at: "2026-09-02T10:00:00Z", quelle: "mail" },
        { created_at: "2026-09-03T10:00:00Z", quelle: "website" },
        { created_at: "2026-09-04T10:00:00Z", quelle: "manuell" },
        { created_at: "2026-09-05T10:00:00Z", quelle: "telefon" }, // unbekannt -> zählt nirgends
        { created_at: "2026-01-01T10:00:00Z", quelle: "mail" }, // ausserhalb der letzten 2 Monate
      ],
      new Date("2026-09-15T10:00:00Z"),
      2
    )
    expect(ergebnis).toEqual([
      { monat: "2026-08", label: "Aug 26", mail: 0, website: 0, manuell: 0 },
      { monat: "2026-09", label: "Sep 26", mail: 2, website: 1, manuell: 1 },
    ])
  })

  it("bucketet nach Zürcher Lokalzeit über einen Monatswechsel", () => {
    const ergebnis = anfragenProMonat(
      [{ created_at: "2026-01-31T23:30:00Z", quelle: "mail" }], // in Zürich bereits 1.2.
      new Date("2026-02-15T10:00:00Z"),
      1
    )
    expect(ergebnis).toEqual([{ monat: "2026-02", label: "Feb 26", mail: 1, website: 0, manuell: 0 }])
  })
})

describe("vermittlungsquote", () => {
  it("liefert null ohne Anfragen", () => {
    expect(vermittlungsquote([])).toEqual({ quote: null, vermittelt: 0, gesamt: 0 })
  })
  it("berechnet den Anteil vermittelter Anfragen", () => {
    expect(vermittlungsquote([{ status: "vermittelt" }, { status: "offen" }, { status: "ruhend" }, { status: "vermittelt" }])).toEqual({
      quote: 0.5,
      vermittelt: 2,
      gesamt: 4,
    })
  })
})

describe("tageBisErstangebot", () => {
  it("liefert Leerwerte ohne Paare", () => {
    expect(tageBisErstangebot([])).toEqual({ median: null, schnitt: null, anzahl: 0 })
  })

  it("berechnet Median bei ungerader Anzahl", () => {
    const ergebnis = tageBisErstangebot([
      { anfrage_erstellt: "2026-01-01T00:00:00Z", gesendet_am: "2026-01-02T00:00:00Z" }, // 1 Tag
      { anfrage_erstellt: "2026-01-01T00:00:00Z", gesendet_am: "2026-01-06T00:00:00Z" }, // 5 Tage
      { anfrage_erstellt: "2026-01-01T00:00:00Z", gesendet_am: "2026-01-04T00:00:00Z" }, // 3 Tage
    ])
    expect(ergebnis).toEqual({ median: 3, schnitt: 3, anzahl: 3 })
  })

  it("berechnet Median bei gerader Anzahl als Mittelwert der beiden mittleren Werte", () => {
    const ergebnis = tageBisErstangebot([
      { anfrage_erstellt: "2026-01-01T00:00:00Z", gesendet_am: "2026-01-02T00:00:00Z" }, // 1 Tag
      { anfrage_erstellt: "2026-01-01T00:00:00Z", gesendet_am: "2026-01-04T00:00:00Z" }, // 3 Tage
      { anfrage_erstellt: "2026-01-01T00:00:00Z", gesendet_am: "2026-01-06T00:00:00Z" }, // 5 Tage
      { anfrage_erstellt: "2026-01-01T00:00:00Z", gesendet_am: "2026-01-10T00:00:00Z" }, // 9 Tage
    ])
    expect(ergebnis).toEqual({ median: 4, schnitt: 4.5, anzahl: 4 })
  })

  it("ignoriert negative Zeitspannen (Datenfehler)", () => {
    const ergebnis = tageBisErstangebot([
      { anfrage_erstellt: "2026-01-05T00:00:00Z", gesendet_am: "2026-01-01T00:00:00Z" }, // negativ
      { anfrage_erstellt: "2026-01-01T00:00:00Z", gesendet_am: "2026-01-03T00:00:00Z" }, // 2 Tage
    ])
    expect(ergebnis).toEqual({ median: 2, schnitt: 2, anzahl: 1 })
  })
})

describe("topObjekte", () => {
  it("liefert eine leere Liste ohne Anfragen", () => {
    expect(topObjekte([], {}, 5)).toEqual([])
  })

  it("zählt Direktanfragen pro Objekt, ignoriert null, begrenzt auf max, sortiert absteigend", () => {
    const anfragen = [
      { objekt_id: "a" },
      { objekt_id: "a" },
      { objekt_id: "a" },
      { objekt_id: "b" },
      { objekt_id: "b" },
      { objekt_id: "c" },
      { objekt_id: null },
    ]
    const titel = { a: "Halle Nord", b: "Büro Zentrum" } // "c" absichtlich ohne Titel
    expect(topObjekte(anfragen, titel, 2)).toEqual([
      { titel: "Halle Nord", anzahl: 3 },
      { titel: "Büro Zentrum", anzahl: 2 },
    ])
  })

  it("fällt bei fehlendem Titel auf die Objekt-ID zurück", () => {
    expect(topObjekte([{ objekt_id: "geloescht-1" }], {}, 5)).toEqual([{ titel: "Gelöschtes Objekt", anzahl: 1 }])
  })
})

describe("tageBisAbschluss", () => {
  it("liefert Leerwerte ohne Abschlüsse", () => {
    expect(tageBisAbschluss([])).toEqual({ median: null, schnitt: null, anzahl: 0 })
  })

  it("berechnet den Median der Spannen Anfrage -> Abschluss", () => {
    const ergebnis = tageBisAbschluss([
      { anfrage_erstellt: "2026-01-01T00:00:00Z", abgeschlossen_am: "2026-01-11T00:00:00Z" }, // 10 Tage
      { anfrage_erstellt: "2026-01-01T00:00:00Z", abgeschlossen_am: "2026-01-21T00:00:00Z" }, // 20 Tage
      { anfrage_erstellt: "2026-01-01T00:00:00Z", abgeschlossen_am: "2026-02-10T00:00:00Z" }, // 40 Tage
      { anfrage_erstellt: "2026-01-01T00:00:00Z", abgeschlossen_am: "2026-01-31T00:00:00Z" }, // 30 Tage
    ])
    expect(ergebnis).toEqual({ median: 25, schnitt: 25, anzahl: 4 })
  })

  it("ignoriert negative Zeitspannen (Datenfehler)", () => {
    const ergebnis = tageBisAbschluss([
      { anfrage_erstellt: "2026-01-05T00:00:00Z", abgeschlossen_am: "2026-01-01T00:00:00Z" },
      { anfrage_erstellt: "2026-01-01T00:00:00Z", abgeschlossen_am: "2026-01-08T00:00:00Z" },
    ])
    expect(ergebnis).toEqual({ median: 7, schnitt: 7, anzahl: 1 })
  })
})

describe("abschluesseJeAnfrage", () => {
  const erstellt = { a1: "2026-01-01T00:00:00Z", a2: "2026-01-02T00:00:00Z" }

  it("nimmt nur vermittelte Treffer mit Abschlussdatum und bekannter Anfrage", () => {
    const ergebnis = abschluesseJeAnfrage(
      [
        { anfrage_id: "a1", status: "vermittelt", abgeschlossen_am: "2026-01-10T00:00:00Z" },
        { anfrage_id: "a2", status: "erledigt", abgeschlossen_am: "2026-01-12T00:00:00Z" },
        { anfrage_id: "a2", status: "vermittelt", abgeschlossen_am: null },
        { anfrage_id: "fremd", status: "vermittelt", abgeschlossen_am: "2026-01-12T00:00:00Z" },
      ],
      erstellt
    )
    expect(ergebnis).toEqual([{ anfrage_erstellt: "2026-01-01T00:00:00Z", abgeschlossen_am: "2026-01-10T00:00:00Z" }])
  })
})
