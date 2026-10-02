import { describe, expect, it } from "vitest"
import { kontextAnfragen, kontextEntwuerfe, kontextMatches, kontextNutzer, kontextObjekte } from "./kontext"

describe("kontextMatches", () => {
  it("nennt neue Treffer und lange ohne Kontakt", () => {
    expect(kontextMatches(3, 2)).toBe("3 neue Treffer · 2 lange ohne Kontakt")
  })
  it("Singular bei einem Treffer", () => {
    expect(kontextMatches(1, 1)).toBe("1 neuer Treffer · 1 lange ohne Kontakt")
  })
  it("0 neue Treffer ohne Nachfass-Teil", () => {
    expect(kontextMatches(0, 0)).toBe("Keine neuen Treffer")
  })
  it("0 neue Treffer, aber lange ohne Kontakt", () => {
    expect(kontextMatches(0, 4)).toBe("Keine neuen Treffer · 4 lange ohne Kontakt")
  })
  it("formatiert grosse Zahlen", () => {
    expect(kontextMatches(1200, 0)).toBe("1’200 neue Treffer")
  })
  it("nennt reservierte Objekte zwischen Treffern und Nachfass", () => {
    expect(kontextMatches(3, 2, 1)).toBe("3 neue Treffer · 1 reserviert · 2 lange ohne Kontakt")
    expect(kontextMatches(0, 0, 4)).toBe("Keine neuen Treffer · 4 reserviert")
    expect(kontextMatches(2, 0, 0)).toBe("2 neue Treffer")
  })
})

describe("kontextAnfragen", () => {
  it("nennt offen und vermittelt", () => {
    expect(kontextAnfragen(5, 2)).toBe("5 offen · 2 vermittelt")
    expect(kontextAnfragen(0, 3)).toBe("0 offen · 3 vermittelt")
  })
  it("0 insgesamt", () => {
    expect(kontextAnfragen(0, 0)).toBe("Noch keine Anfragen")
  })
})

describe("kontextObjekte", () => {
  it("nennt Bestand und öffentlich", () => {
    expect(kontextObjekte(12, 8)).toBe("12 im Bestand · 8 öffentlich")
    expect(kontextObjekte(1, 0)).toBe("1 im Bestand · 0 öffentlich")
  })
  it("leerer Bestand", () => {
    expect(kontextObjekte(0, 0)).toBe("Noch keine Objekte im Bestand")
  })
})

describe("kontextEntwuerfe", () => {
  it("Singular und Plural", () => {
    expect(kontextEntwuerfe(1)).toBe("1 offener Entwurf")
    expect(kontextEntwuerfe(3)).toBe("3 offene Entwürfe")
  })
  it("0 offen", () => {
    expect(kontextEntwuerfe(0)).toBe("Keine offenen Entwürfe")
  })
})

describe("kontextNutzer", () => {
  it("Singular und Plural", () => {
    expect(kontextNutzer(1, 0)).toBe("1 aktives Konto")
    expect(kontextNutzer(4, 2)).toBe("4 aktive Konten · 2 eingeladen")
  })
  it("0 aktiv", () => {
    expect(kontextNutzer(0, 1)).toBe("Keine aktiven Konten · 1 eingeladen")
    expect(kontextNutzer(0, 0)).toBe("Keine aktiven Konten")
  })
})
