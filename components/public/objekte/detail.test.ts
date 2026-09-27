import { describe, expect, it } from "vitest"
import type { OeffentlichesObjekt } from "@/lib/objektsuche"
import {
  eigenschaftChips, heuteInZuerich, kartenUrl, kuerzen, metaBeschreibung, metaTitel, preisText, verfuegbarText, vorbelegteNachricht,
} from "./detail"

const objekt: OeffentlichesObjekt = {
  id: "0b6f6f3c-6a1f-4c8e-9d7a-1a2b3c4d5e6f",
  titel: "Helles Büro",
  ort: "Solothurn",
  flaeche: 1250,
  preis_pro_m2: 180,
  nutzung: "buero",
  eigenschaften: {},
  verfuegbar_ab: "2026-10-01",
  status: "verfuegbar",
  created_at: "2026-09-01T00:00:00Z",
  beschreibung: null,
  titelbild: null,
}

describe("metaTitel", () => {
  it("nennt Titel und Ort", () => {
    expect(metaTitel(objekt)).toBe("Helles Büro in Solothurn · immoheart")
  })
})

describe("metaBeschreibung", () => {
  it("nimmt die Beschreibung mit zusammengefassten Leerzeichen", () => {
    expect(metaBeschreibung({ ...objekt, beschreibung: "  Grosse Fenster.\n\nLift  vorhanden. " })).toBe("Grosse Fenster. Lift vorhanden.")
  })

  it("kürzt lange Beschreibungen auf höchstens 160 Zeichen", () => {
    const text = metaBeschreibung({ ...objekt, beschreibung: "Wort ".repeat(60) })
    expect(text.length).toBeLessThanOrEqual(160)
    expect(text.endsWith("Wort…")).toBe(true)
  })

  it("fällt ohne Beschreibung auf die Eckdaten zurück", () => {
    expect(metaBeschreibung(objekt)).toBe("Büro · 1’250 m² · CHF 180/m² · Solothurn")
    expect(metaBeschreibung({ ...objekt, beschreibung: "   ", preis_pro_m2: null })).toBe("Büro · 1’250 m² · Preis auf Anfrage · Solothurn")
  })
})

describe("kuerzen", () => {
  it("lässt kurze Texte unverändert", () => {
    expect(kuerzen("kurz", 10)).toBe("kurz")
  })

  it("schneidet ohne Leerzeichen hart", () => {
    expect(kuerzen("abcdefghijkl", 6)).toBe("abcde…")
  })
})

describe("preisText", () => {
  it("formatiert den Preis oder sagt auf Anfrage", () => {
    expect(preisText(1200)).toBe("CHF 1’200/m²")
    expect(preisText(null)).toBe("auf Anfrage")
  })
})

describe("kartenUrl", () => {
  it("kodiert nur den Ortsnamen mit Land", () => {
    expect(kartenUrl("Biberist & Umgebung")).toBe("https://www.google.com/maps?q=Biberist%20%26%20Umgebung%2C%20Schweiz&output=embed")
  })
})

describe("eigenschaftChips", () => {
  it("zeigt wahre Schalter und Werte, verwirft den Rest", () => {
    expect(
      eigenschaftChips({ lift: true, parkplaetze: 4, rampe: false, boden: " Parkett ", leer: "", liste: [1], nichts: null })
    ).toEqual(["Boden: Parkett", "Lift", "Parkplaetze: 4"])
  })
})

describe("verfuegbarText", () => {
  it("sagt sofort für heute oder früher", () => {
    expect(verfuegbarText("2026-09-27", "2026-09-27")).toBe("sofort")
    expect(verfuegbarText("2025-01-01", "2026-09-27")).toBe("sofort")
  })

  it("zeigt künftige Daten als TT.MM.JJJJ", () => {
    expect(verfuegbarText("2026-10-01", "2026-09-27")).toBe("01.10.2026")
  })
})

describe("heuteInZuerich", () => {
  it("nimmt den Schweizer Kalendertag, nicht UTC", () => {
    expect(heuteInZuerich(new Date("2026-09-27T22:30:00Z"))).toBe("2026-09-28")
    expect(heuteInZuerich(new Date("2026-09-27T12:00:00Z"))).toBe("2026-09-27")
  })
})

describe("vorbelegteNachricht", () => {
  it("nennt den Objekttitel", () => {
    expect(vorbelegteNachricht("Helles Büro")).toBe("Ich interessiere mich für „Helles Büro“ und bitte um weitere Informationen.")
  })
})
