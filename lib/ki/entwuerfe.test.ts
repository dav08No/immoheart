import { describe, expect, it } from "vitest"
import {
  baueRueckfragePrompt, baueAngebotPrompt, baueNachfassPrompt, parseMailAntwort,
  baueAntwortPrompt, baueObjektangebotPrompt, FOTO_BITTE, FOTOS_VORHANDEN, ANTWORT_ROLLE,
} from "./entwuerfe"
import type { ErkannteFelder } from "./erkennung"
import type { Anfrage, Objekt } from "@/types"

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
