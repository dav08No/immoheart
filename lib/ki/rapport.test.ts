import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("./gemini", async (orig) => ({ ...(await orig<typeof import("./gemini")>()), generiereText: vi.fn() }))
import { generiereText } from "./gemini"
import { baueRapportPrompt, entwurfRapportText, parseRapportAntwort } from "./rapport"
import type { KennzahlenFuerKi } from "@/lib/rapport/typen"

const eingabe: KennzahlenFuerKi = {
  zeitraum: "Jahr 2026",
  kennzahlen: { neueAnfragen: 42, neueObjekte: 7, treffer: 130, angebote: 55, vermittlungen: 3, vermittlungsquote: 0.07 },
  medianwerte: { tageBisErstangebot: 4, tageBisAbschluss: null },
  anfragenProMonat: [{ label: "Jan 2026", mail: 11, website: 5, manuell: 2 }],
  angeboteUndVermittlungenProMonat: [{ label: "Jan 2026", angebote: 9, vermittlungen: 1 }],
  trefferNachErgebnis: [{ ergebnis: "Archiviert", anzahl: 61 }],
  nutzungen: [{ label: "Büro", anzahl: 12 }],
}
const gut = { rueckblick: "A", trends: "B", auffaelligkeiten: "C", ausblick: "D" }
const mock = vi.mocked(generiereText)

describe("baueRapportPrompt", () => {
  it("enthält Zahlen und Zeitraum", () => {
    const p = baueRapportPrompt(eingabe)
    for (const s of ["Jahr 2026", "42", "130", "0.07", "Büro", "Jan 2026", "Archiviert"]) expect(p).toContain(s)
    expect(p).toContain("rueckblick")
  })

  it("liest nur bekannte Zahlenfelder, keine Namen", () => {
    const mitNamen = { ...eingabe, firma: "Muster AG", email: "a@b.ch", kontakt: "Frau Muster" }
    const p = baueRapportPrompt(mitNamen)
    for (const s of ["Muster", "a@b.ch", "firma", "email"]) expect(p).not.toContain(s)
  })
})

describe("parseRapportAntwort", () => {
  it("parst JSON", () => expect(parseRapportAntwort(JSON.stringify(gut))).toEqual(gut))
  it("entfernt Code-Zäune", () => expect(parseRapportAntwort("```json\n" + JSON.stringify(gut) + "\n```")).toEqual(gut))
  it("kürzt auf 1200 Zeichen", () =>
    expect(parseRapportAntwort(JSON.stringify({ ...gut, trends: "x".repeat(2000) })).trends).toHaveLength(1200))
  it("wirft bei fehlendem oder leerem Abschnitt", () => {
    expect(() => parseRapportAntwort(JSON.stringify({ ...gut, ausblick: undefined }))).toThrow()
    expect(() => parseRapportAntwort(JSON.stringify({ ...gut, trends: "  " }))).toThrow()
  })
  it("wirft bei ungültigem JSON", () => expect(() => parseRapportAntwort("kein json")).toThrow())
})

describe("entwurfRapportText", () => {
  // Block statt Ausdruck: beforeEach würde die zurückgegebene Mock-Funktion sonst als Aufräum-Callback aufrufen.
  beforeEach(() => {
    mock.mockReset()
  })

  it("liefert Text mit genau einem Aufruf", async () => {
    mock.mockResolvedValue(JSON.stringify(gut))
    expect(await entwurfRapportText(eingabe)).toEqual({ text: gut })
    expect(mock).toHaveBeenCalledTimes(1)
  })
  it("gibt fehler bei Ablehnung zurück", async () => {
    mock.mockRejectedValue(new Error("boom"))
    expect(await entwurfRapportText(eingabe)).toEqual({ fehler: "Verarbeitung fehlgeschlagen: boom" })
  })
  it("gibt fehler bei ungültiger Antwort zurück", async () => {
    mock.mockResolvedValue("Hallo")
    const r = await entwurfRapportText(eingabe)
    expect(r).toEqual({ fehler: "Unerwartete Antwort der KI." })
    expect(mock).toHaveBeenCalledTimes(1)
  })
})
