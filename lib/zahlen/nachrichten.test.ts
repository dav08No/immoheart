import { describe, expect, it } from "vitest"
import { entwuerfeVerlauf, mailsProWoche } from "./nachrichten"

describe("entwuerfeVerlauf", () => {
  it("liefert Leerwerte für jeden Monat bei leerer Eingabe", () => {
    expect(entwuerfeVerlauf([], new Date("2026-09-15T10:00:00Z"), 2)).toEqual([
      { monat: "2026-08", label: "Aug 26", gesendet: 0, geloescht: 0 },
      { monat: "2026-09", label: "Sep 26", gesendet: 0, geloescht: 0 },
    ])
  })

  it("zählt gesendet im Versandmonat und gelöscht im Löschmonat -- nicht im Erstellungsmonat", () => {
    const ergebnis = entwuerfeVerlauf(
      [
        // Entwurf im August erstellt, aber erst im September versandt -> zählt in September
        { richtung: "gesendet", created_at: "2026-08-20T10:00:00Z", gesendet_am: "2026-09-02T10:00:00Z", geloescht_am: null },
        { richtung: "entwurf", created_at: "2026-09-03T10:00:00Z", gesendet_am: null, geloescht_am: "2026-09-04T10:00:00Z" },
        { richtung: "entwurf", created_at: "2026-09-05T10:00:00Z", gesendet_am: null, geloescht_am: null }, // noch offen -> zählt nirgends
        { richtung: "gesendet", created_at: "2026-09-06T10:00:00Z", gesendet_am: null, geloescht_am: null }, // Datenfehler: gesendet ohne gesendet_am -> ignoriert
        { richtung: "gesendet", created_at: "2026-01-01T10:00:00Z", gesendet_am: "2026-01-02T10:00:00Z", geloescht_am: null }, // ausserhalb der letzten 2 Monate
      ],
      new Date("2026-09-15T10:00:00Z"),
      2
    )
    expect(ergebnis).toEqual([
      { monat: "2026-08", label: "Aug 26", gesendet: 0, geloescht: 0 },
      { monat: "2026-09", label: "Sep 26", gesendet: 1, geloescht: 1 },
    ])
  })
})

describe("mailsProWoche", () => {
  it("liefert Leerwerte für jede Woche bei leerer Eingabe", () => {
    expect(mailsProWoche([], new Date("2026-09-28T10:00:00Z"), 1)).toEqual([{ woche: "2026-W40", label: "KW 40", ein: 0, aus: 0 }])
  })

  it("zählt eingehend nach empfangen_am und ausgehend nach gesendet_am, ignoriert Entwürfe", () => {
    const ergebnis = mailsProWoche(
      [
        { richtung: "eingang", quelle: "mail", empfangen_am: "2026-09-28T10:00:00Z", created_at: "2026-09-28T10:00:00Z", gesendet_am: null },
        { richtung: "eingang", quelle: "mail", empfangen_am: null, created_at: "2026-09-28T11:00:00Z", gesendet_am: null }, // Fallback auf created_at
        { richtung: "gesendet", quelle: null, empfangen_am: null, created_at: "2026-09-28T09:00:00Z", gesendet_am: "2026-09-28T12:00:00Z" },
        { richtung: "entwurf", quelle: null, empfangen_am: null, created_at: "2026-09-28T09:00:00Z", gesendet_am: null }, // kein Ein/Aus
      ],
      new Date("2026-09-28T10:00:00Z"),
      1
    )
    expect(ergebnis).toEqual([{ woche: "2026-W40", label: "KW 40", ein: 2, aus: 1 }])
  })

  it("überquert den 53/1-Wochenwechsel korrekt", () => {
    const ergebnis = mailsProWoche(
      [{ richtung: "eingang", quelle: "mail", empfangen_am: "2021-01-01T12:00:00Z", created_at: "2021-01-01T12:00:00Z", gesendet_am: null }],
      new Date("2021-01-04T12:00:00Z"),
      2
    )
    expect(ergebnis).toEqual([
      { woche: "2020-W53", label: "KW 53", ein: 1, aus: 0 },
      { woche: "2021-W01", label: "KW 1", ein: 0, aus: 0 },
    ])
  })
})
