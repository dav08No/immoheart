import { describe, expect, it } from "vitest"
import {
  abrufAnzeige,
  aktionsBlock,
  anhangBadges,
  chipVon,
  filtereNachrichten,
  fotoUebernahme,
  istUngelesen,
  kiAnzeige,
  nichtGespeicherteAnhaenge,
  objektDatenAus,
  suchanfrageKopf,
  zaehleChips,
} from "./postfach"

const mail = { richtung: "eingang", quelle: "mail", kategorie: "suchanfrage" } as const
const web = { richtung: "eingang", quelle: "website", kategorie: "antwort" } as const
const gesendet = { richtung: "gesendet", quelle: "mail", kategorie: null } as const
const sonstig = { richtung: "eingang", quelle: "mail", kategorie: "sonstiges" } as const
const objektanfrage = { richtung: "eingang", quelle: "website", kategorie: "objektanfrage" } as const
const alle = [mail, web, gesendet, sonstig, objektanfrage]

describe("filtereNachrichten", () => {
  it("Alle zeigt alles", () => {
    expect(filtereNachrichten(alle, "alle", null)).toHaveLength(5)
  })
  it("Eingang zeigt nur Mails, Website nur Website-Eingänge", () => {
    expect(filtereNachrichten(alle, "eingang", null)).toEqual([mail, sonstig])
    expect(filtereNachrichten(alle, "website", null)).toEqual([web, objektanfrage])
  })
  it("Gesendet zeigt nur gesendete", () => {
    expect(filtereNachrichten(alle, "gesendet", null)).toEqual([gesendet])
  })
  it("Chip grenzt zusätzlich nach Kategorie ein", () => {
    expect(filtereNachrichten(alle, "alle", "antwort")).toEqual([web])
    expect(filtereNachrichten(alle, "eingang", "antwort")).toEqual([])
    expect(filtereNachrichten(alle, "alle", "sonstiges")).toEqual([sonstig])
    expect(filtereNachrichten(alle, "website", "objektanfrage")).toEqual([objektanfrage])
  })
})

describe("chipVon / zaehleChips", () => {
  it("objektanfrage hat einen eigenen Chip, null ist keine Kategorie", () => {
    expect(chipVon("objektanfrage")).toBe("objektanfrage")
    expect(chipVon("sonstiges")).toBe("sonstiges")
    expect(chipVon(null)).toBeNull()
  })
  it("zählt nur innerhalb des Filters", () => {
    expect(zaehleChips(alle, "alle")).toEqual({
      suchanfrage: 1,
      antwort: 1,
      objektangebot: 0,
      objektanfrage: 1,
      sonstiges: 1,
    })
    expect(zaehleChips(alle, "website")).toEqual({
      suchanfrage: 0,
      antwort: 1,
      objektangebot: 0,
      objektanfrage: 1,
      sonstiges: 0,
    })
  })
})

describe("anhangBadges", () => {
  it("fasst Bilder und PDFs zusammen", () => {
    expect(anhangBadges(["image/jpeg", "image/png", "application/pdf"])).toEqual(["2 Bilder", "PDF"])
    expect(anhangBadges(["image/webp"])).toEqual(["1 Bild"])
    expect(anhangBadges(["application/pdf", "application/pdf"])).toEqual(["2 PDFs"])
    expect(anhangBadges([])).toEqual([])
  })
})

describe("istUngelesen / kiAnzeige", () => {
  it("nur ungelesene Eingänge sind fett", () => {
    expect(istUngelesen({ richtung: "eingang", gelesen: false })).toBe(true)
    expect(istUngelesen({ richtung: "eingang", gelesen: true })).toBe(false)
    expect(istUngelesen({ richtung: "gesendet", gelesen: false })).toBe(false)
  })
  it("zeigt Symbol nur für wartend, laufend und Fehler", () => {
    expect(kiAnzeige("offen")).toBe("wartet")
    expect(kiAnzeige("laeuft")).toBe("laeuft")
    expect(kiAnzeige("fehler")).toBe("fehler")
    expect(kiAnzeige("fertig")).toBeNull()
    expect(kiAnzeige(null)).toBeNull()
  })
})

describe("aktionsBlock", () => {
  const basis = { richtung: "eingang", kategorie: null, ki_status: "fertig", erkannte_felder: null } as const
  it("folgt der Kategorie", () => {
    expect(aktionsBlock({ ...basis, kategorie: "antwort" })).toBe("antwort")
    expect(aktionsBlock({ ...basis, kategorie: "objektangebot" })).toBe("objektangebot")
    expect(aktionsBlock({ ...basis, kategorie: "objektanfrage" })).toBe("objektanfrage")
    expect(aktionsBlock({ ...basis, kategorie: "sonstiges" })).toBeNull()
  })
  it("keine Aktionen, solange die KI noch arbeitet", () => {
    expect(aktionsBlock({ ...basis, kategorie: "suchanfrage", ki_status: "laeuft" })).toBeNull()
    expect(aktionsBlock({ ...basis, kategorie: "suchanfrage", ki_status: "offen" })).toBeNull()
  })
  it("Fehler mit bekannter Kategorie zeigt trotzdem die Aktionen", () => {
    expect(aktionsBlock({ ...basis, kategorie: "suchanfrage", ki_status: "fehler" })).toBe("suchanfrage")
  })
  it("Altdaten ohne Kategorie, aber mit Feldern, sind Suchanfragen", () => {
    expect(aktionsBlock({ ...basis, ki_status: null, erkannte_felder: { ort: "Solothurn" } })).toBe("suchanfrage")
    expect(aktionsBlock({ ...basis, ki_status: null })).toBeNull()
  })
  it("gesendete Mails haben keinen Aktionsblock", () => {
    expect(aktionsBlock({ ...basis, richtung: "gesendet", kategorie: "antwort" })).toBeNull()
  })
})

describe("nichtGespeicherteAnhaenge / objektDatenAus", () => {
  it("liest nur Strings aus dem Json-Array", () => {
    expect(nichtGespeicherteAnhaenge(["a.docx", 3, "b.zip"])).toEqual(["a.docx", "b.zip"])
    expect(nichtGespeicherteAnhaenge({ x: 1 })).toEqual([])
  })
  it("liefert Objektdaten nur aus { objekt: {...} }", () => {
    expect(objektDatenAus({ objekt: { titel: "Halle" } })).toEqual({ titel: "Halle" })
    expect(objektDatenAus({ ort: "Solothurn" })).toBeNull()
    expect(objektDatenAus(null)).toBeNull()
    expect(objektDatenAus([1])).toBeNull()
  })
})

describe("abrufAnzeige", () => {
  const erfolg = "2026-09-27T08:00:00Z"
  it("zeigt einen Fehler, der nach dem letzten Erfolg kam", () => {
    const s = { letzterErfolg: erfolg, letzterFehler: "IMAP down", letzterFehlerAm: "2026-09-27T09:00:00Z" }
    expect(abrufAnzeige(s).fehler).toEqual({ text: "IMAP down", am: "2026-09-27T09:00:00Z" })
  })
  it("blendet einen durch späteren Erfolg erledigten Fehler aus", () => {
    const s = { letzterErfolg: erfolg, letzterFehler: "IMAP down", letzterFehlerAm: "2026-09-27T07:00:00Z" }
    expect(abrufAnzeige(s)).toEqual({ erfolgAm: erfolg, fehler: null })
  })
  it("zeigt den Fehler, wenn es noch nie einen Erfolg gab", () => {
    const s = { letzterErfolg: null, letzterFehler: "x", letzterFehlerAm: erfolg }
    expect(abrufAnzeige(s).fehler?.text).toBe("x")
  })
})

describe("fotoUebernahme", () => {
  it("erlaubt nur JPEG, PNG und WebP", () => {
    expect(fotoUebernahme("image/jpeg")).toBe("moeglich")
    expect(fotoUebernahme("image/png")).toBe("moeglich")
    expect(fotoUebernahme("image/webp")).toBe("moeglich")
    expect(fotoUebernahme("image/gif")).toBe("nein")
    expect(fotoUebernahme("application/pdf")).toBe("nein")
  })
  it("erkennt HEIC/HEIF für den Hinweis", () => {
    expect(fotoUebernahme("image/heic")).toBe("heic")
    expect(fotoUebernahme("image/heif")).toBe("heic")
  })
})

describe("suchanfrageKopf", () => {
  const felder = { firma: "Muster AG", branche: null, ort: "Solothurn", bezug: null }

  it("zählt bei Mail-Eingängen fehlende Felder und bietet die Rückfrage an", () => {
    expect(suchanfrageKopf("mail", felder)).toEqual({ ueberschrift: "immoheart hat erkannt · 2 fehlt", rueckfrage: true })
  })

  it("ohne Lücken keine Rückfrage", () => {
    expect(suchanfrageKopf("mail", { firma: "Muster AG" })).toEqual({ ueberschrift: "immoheart hat erkannt", rueckfrage: false })
  })

  it("zeigt Website-Suchaufträge neutral, ohne Zähler und ohne Rückfrage", () => {
    expect(suchanfrageKopf("website", felder)).toEqual({ ueberschrift: "Angaben aus dem Formular", rueckfrage: false })
  })
})
