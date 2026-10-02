import { describe, expect, it } from "vitest"
import {
  baueRueckfragePrompt, baueAngebotPrompt, baueNachfassPrompt, parseMailAntwort,
  baueAntwortPrompt, baueObjektangebotPrompt, FOTO_BITTE, FOTOS_VORHANDEN, ANTWORT_ROLLE, AUSGABEFORMAT,
} from "./entwuerfe"
import type { ErkannteFelder } from "./erkennung"
import type { Anfrage, Kriterium, Objekt } from "@/types"

describe("parseMailAntwort", () => {
  it("parst betreff und body", () => {
    expect(parseMailAntwort('{"betreff":"Rückfrage","body":"Guten Tag..."}')).toEqual({
      betreff: "Rückfrage", body: "Guten Tag...",
    })
  })
  it("entfernt Markdown-Codezäune", () => {
    expect(parseMailAntwort('```json\n{"betreff":"X","body":"Y"}\n```')).toEqual({ betreff: "X", body: "Y" })
  })
})

describe("baueRueckfragePrompt", () => {
  it("nennt nur die fehlenden Felder", () => {
    const felder: ErkannteFelder = {
      firma: "Muster AG", flaeche_min: 500, flaeche_max: 800, ort: "Solothurn",
      budget_pro_m2: null, bezug: null, branche: null, nutzung: "lager",
    }
    const prompt = baueRueckfragePrompt(felder)
    expect(prompt).toContain("budget_pro_m2")
    expect(prompt).toContain("bezug")
    expect(prompt).not.toContain("flaeche_min")
  })
})

describe("baueAngebotPrompt", () => {
  it("enthält Objekttitel und Hinweis", () => {
    const anfrage: Anfrage = {
      id: "a1", flaecheMin: 180, flaecheMax: 260, ort: "Solothurn", budgetProM2: 250,
      bezug: "Q4 2026", nutzung: "buero", anforderungen: {}, letzterKontakt: new Date(),
    }
    const objekt: Objekt = {
      id: "o1", titel: "Büro Altstadt", ort: "Solothurn", flaeche: 240, preisProM2: 245,
      nutzung: "buero", eigenschaften: {}, verfuegbarAb: new Date(),
    }
    const prompt = baueAngebotPrompt(anfrage, objekt, [], "Bezug liegt einen Monat später.")
    expect(prompt).toContain("Büro Altstadt")
    expect(prompt).toContain("Bezug liegt einen Monat später.")
  })
  // I5: ohne frueherAngeboten muss der Prompt Byte für Byte dem bisherigen entsprechen.
  const anfrage: Anfrage = {
    id: "a1", flaecheMin: 180, flaecheMax: 260, ort: "Solothurn", budgetProM2: 250,
    bezug: "Q4 2026", nutzung: "buero", anforderungen: {}, letzterKontakt: new Date(),
  }
  const objekt: Objekt = {
    id: "o1", titel: "Büro Altstadt", ort: "Solothurn", flaeche: 240, preisProM2: 245,
    nutzung: "buero", eigenschaften: {}, verfuegbarAb: new Date(),
  }
  const kriterien: Kriterium[] = [{ kriterium: "Fläche", gesucht: "180–260 m²", angeboten: "240 m²", status: "ok" }]

  it("bleibt ohne früheres Angebot byte-identisch zum bisherigen Prompt", () => {
    const bisher = `Eine Firma sucht eine Gewerbefläche. Folgendes Objekt passt:

Objekt: Büro Altstadt, 240 m², CHF 245/m²
Vergleich:
- Fläche: gesucht 180–260 m², Objekt 240 m² (ok)
Wichtigster Hinweis: Passt gut.

Schreibe eine kurze Angebots-Mail an die Firma, die das Objekt vorstellt und zu einer Besichtigung einlädt. ${AUSGABEFORMAT}`
    expect(baueAngebotPrompt(anfrage, objekt, kriterien, "Passt gut.")).toBe(bisher)
    expect(baueAngebotPrompt(anfrage, objekt, kriterien, "Passt gut.", null)).toBe(bisher)
  })

  it("erwähnt ein früheres Angebot mit Datum und die unerwartete Verfügbarkeit", () => {
    const prompt = baueAngebotPrompt(anfrage, objekt, kriterien, "Passt gut.", "14.09.2026")
    expect(prompt).toContain("am 14.09.2026 schon einmal angeboten")
    expect(prompt).toContain("unerwartet wieder verfügbar")
    expect(prompt).toContain("Wichtigster Hinweis: Passt gut.\nDieses Objekt")
  })
})

describe("baueNachfassPrompt", () => {
  it("nennt die Anzahl Tage und den Ort", () => {
    const anfrage: Anfrage = {
      id: "a1", flaecheMin: null, flaecheMax: null, ort: "Zuchwil", budgetProM2: null,
      bezug: null, nutzung: "gewerbe", anforderungen: {}, letzterKontakt: new Date(),
    }
    const prompt = baueNachfassPrompt(anfrage, 96)
    expect(prompt).toContain("96 Tagen")
    expect(prompt).toContain("Zuchwil")
  })
})

describe("baueAntwortPrompt", () => {
  it("enthält Betreff, Text und Anfrage-Zusammenfassung", () => {
    const prompt = baueAntwortPrompt({
      eingangBetreff: "Re: Büro Altstadt",
      eingangText: "Wir möchten gerne besichtigen.",
      anfrageKurz: "Büro, 200 m², Solothurn",
    })
    expect(prompt).toContain("Re: Büro Altstadt")
    expect(prompt).toContain("Wir möchten gerne besichtigen.")
    expect(prompt).toContain(ANTWORT_ROLLE)
    expect(prompt).toContain("Büro, 200 m², Solothurn")
  })
  it("kommt ohne Anfrage aus", () => {
    const prompt = baueAntwortPrompt({ eingangBetreff: "Frage", eingangText: "Hallo", anfrageKurz: null })
    expect(prompt).toContain("Frage")
    expect(prompt).not.toContain("null")
  })
  it("ist ohne angebot byte-identisch zum bisherigen Prompt", () => {
    const ohneFeld = baueAntwortPrompt({ eingangBetreff: "Frage", eingangText: "Hallo", anfrageKurz: "Büro" })
    const mitNull = baueAntwortPrompt({ eingangBetreff: "Frage", eingangText: "Hallo", anfrageKurz: "Büro", angebot: null })
    expect(mitNull).toBe(ohneFeld)
  })
  it("stellt bei einem Angebot die Angebots-Anweisung statt der Standard-Anweisung", () => {
    const prompt = baueAntwortPrompt({
      eingangBetreff: "Re: Büro Altstadt",
      eingangText: "Können wir besichtigen?",
      anfrageKurz: null,
      angebot: { objektTitel: "Büro Altstadt", eckdaten: "240 m², CHF 245/m²" },
    })
    expect(prompt).toContain("Die Firma antwortet auf das Angebot für Büro Altstadt.")
    expect(prompt).toContain("erfinde keine Termine, Preise oder weiteren Objekte.")
    expect(prompt).toContain("240 m², CHF 245/m²")
    expect(prompt).toContain(ANTWORT_ROLLE)
    expect(prompt).not.toContain("prüft passende Flächen")
  })
})

describe("baueObjektangebotPrompt", () => {
  it("enthält den Betreff und bittet ohne Bilder um Fotos", () => {
    const prompt = baueObjektangebotPrompt({ betreff: "Lagerhalle Zuchwil", text: "Zu vermieten", hatBilder: false })
    expect(prompt).toContain("Lagerhalle Zuchwil")
    expect(prompt).toContain(FOTO_BITTE)
  })
  it("bittet mit Bildern nicht um Fotos", () => {
    const prompt = baueObjektangebotPrompt({ betreff: "Lagerhalle Zuchwil", text: "Zu vermieten", hatBilder: true })
    expect(prompt).toContain("Lagerhalle Zuchwil")
    expect(prompt).not.toContain(FOTO_BITTE)
    expect(prompt).toContain(FOTOS_VORHANDEN)
  })
})
