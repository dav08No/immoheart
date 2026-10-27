import { describe, expect, it } from "vitest"
import { BEISPIEL_JETZT, BEISPIEL_ROHDATEN } from "./beispiel-daten"
import { bereinigeText, bereinigeZusammenfassung, MAX_KI_ABSCHNITT, MAX_ZELLE } from "./bereinigen"
import { baueRapportModell } from "./modell"
import { rapportZeitraum } from "./zeitraum"

const ERSATZ = String.fromCodePoint(0xfffd)

describe("bereinigeText", () => {
  it("entfernt Steuerzeichen, behält Tab und Umbrüche", () => {
    expect(bereinigeText("a\x00b\x0bc\x7fd\te\nf\r", 100)).toBe("abcd\te\nf\r")
  })

  it("ersetzt einzelne Surrogate, behält gültige Paare", () => {
    expect(bereinigeText("x\uD800y\uDC00z😀", 100)).toBe(`x${ERSATZ}y${ERSATZ}z😀`)
  })

  it("kürzt nach Codepunkten, ohne ein Emoji zu zerschneiden", () => {
    expect(bereinigeText("😀".repeat(10), 3)).toBe("😀😀😀")
  })

  it("lässt kurze, saubere Texte unverändert", () => {
    expect(bereinigeText("Muster AG", MAX_ZELLE)).toBe("Muster AG")
  })
})

describe("bereinigeZusammenfassung", () => {
  it("kürzt KI-Abschnitte auf 1500 und den Fehler auf 500 Zeichen", () => {
    const lang = "a\x01".repeat(2000)
    const t = bereinigeZusammenfassung({ text: { rueckblick: lang, trends: "T", auffaelligkeiten: "A", ausblick: "O" } })
    expect("text" in t && t.text.rueckblick).toBe("a".repeat(MAX_KI_ABSCHNITT))
    expect(bereinigeZusammenfassung({ fehler: "f".repeat(600) })).toEqual({ fehler: "f".repeat(MAX_ZELLE) })
  })
})

describe("baueRapportModell mit kaputtem Firmennamen", () => {
  it("kürzt einen 600 Zeichen langen Namen mit \\x0b auf 500 saubere Zeichen", () => {
    const name = `${"M".repeat(300)}\x0b${"N".repeat(299)}`
    const roh = { ...BEISPIEL_ROHDATEN, firmen: [{ id: "f1", name }, ...BEISPIEL_ROHDATEN.firmen.slice(1)] }
    const m = baueRapportModell(roh, rapportZeitraum(BEISPIEL_JETZT))
    const firma = m.tabellen.vermittlungen.zeilen[0]?.firma
    expect(firma).toBe(`${"M".repeat(300)}${"N".repeat(200)}`)
    const texte = Object.values(m.tabellen).flatMap((t) => t.zeilen.flatMap((z) => Object.values(z)))
    expect(texte.some((w) => typeof w === "string" && (w.length > MAX_ZELLE || /[\x0b]/.test(w)))).toBe(false)
  })
})
