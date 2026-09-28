import { describe, expect, it } from "vitest"
import { suchauftragEntwurf, suchauftragFelder, suchauftragNachricht, suchauftragSchema } from "./suchauftrag"

// So kommt ein Formular an: alles Strings, leere Felder als "".
const FORMULAR = {
  firma: "  Muster AG ",
  branche: " Logistik ",
  name: " Anna Muster ",
  email: " ANNA@Muster.ch ",
  telefon: "",
  nutzung: "lager",
  ort: " Solothurn ",
  flaecheMin: "500",
  flaecheMax: "800",
  budgetProM2: "180",
  bezug: " ab 1.1.2027 ",
  nachricht: "",
}

function meldung(eingabe: Record<string, unknown>, feld: string): string | undefined {
  const ergebnis = suchauftragSchema.safeParse(eingabe)
  if (ergebnis.success) return undefined
  return ergebnis.error.issues.find((i) => i.path[0] === feld)?.message
}

describe("suchauftragSchema", () => {
  it("akzeptiert ein gültiges Formular, trimmt und wandelt Zahlen um", () => {
    const s = suchauftragSchema.parse(FORMULAR)
    expect(s).toMatchObject({ firma: "Muster AG", name: "Anna Muster", email: "anna@muster.ch", ort: "Solothurn" })
    expect(s).toMatchObject({ flaecheMin: 500, flaecheMax: 800, budgetProM2: 180, bezug: "ab 1.1.2027" })
    expect(s.branche).toBe("Logistik")
    expect(s.telefon).toBeUndefined()
    expect(s.nachricht).toBeUndefined()
  })

  it("verlangt Pflichtfelder mit deutschen Meldungen", () => {
    expect(meldung({ ...FORMULAR, firma: " " }, "firma")).toBe("Bitte geben Sie Ihre Firma an.")
    expect(meldung({ ...FORMULAR, name: "" }, "name")).toBe("Bitte geben Sie Ihren Namen an.")
    expect(meldung({ ...FORMULAR, email: "x" }, "email")).toBe("Bitte geben Sie eine gültige E-Mail-Adresse an.")
    expect(meldung({ ...FORMULAR, ort: "" }, "ort")).toBe("Bitte geben Sie einen Ort an.")
  })

  it("lehnt eine ungültige Nutzung ab", () => {
    expect(meldung({ ...FORMULAR, nutzung: "wohnen" }, "nutzung")).toBe("Bitte wählen Sie eine Nutzung.")
  })

  it("lässt leere Zahlenfelder weg", () => {
    const s = suchauftragSchema.parse({ ...FORMULAR, flaecheMin: "", flaecheMax: "", budgetProM2: "" })
    expect(s.flaecheMin).toBeUndefined()
    expect(s.flaecheMax).toBeUndefined()
    expect(s.budgetProM2).toBeUndefined()
  })

  it("lehnt Kommazahlen, Text, negative und zu grosse Zahlen ab", () => {
    expect(meldung({ ...FORMULAR, flaecheMin: "12.5" }, "flaecheMin")).toBe("Bitte eine ganze Zahl angeben.")
    expect(meldung({ ...FORMULAR, flaecheMin: "viel" }, "flaecheMin")).toBe("Bitte eine ganze Zahl angeben.")
    expect(meldung({ ...FORMULAR, flaecheMax: "-1" }, "flaecheMax")).toBe("Die Zahl darf nicht negativ sein.")
    expect(meldung({ ...FORMULAR, flaecheMax: "100001" }, "flaecheMax")).toBe("Höchstens 100000.")
    expect(meldung({ ...FORMULAR, budgetProM2: "10001" }, "budgetProM2")).toBe("Höchstens 10000.")
  })

  it("tauscht Fläche min/max, wenn vertauscht eingegeben", () => {
    const s = suchauftragSchema.parse({ ...FORMULAR, flaecheMin: "900", flaecheMax: "300" })
    expect([s.flaecheMin, s.flaecheMax]).toEqual([300, 900])
  })

  it("prüft Telefon wie bei der Objektanfrage und begrenzt Bezug/Nachricht", () => {
    expect(meldung({ ...FORMULAR, telefon: "abc" }, "telefon")).toBe(
      "Bitte nur Ziffern, +, Leerzeichen, Klammern, / und - verwenden."
    )
    expect(meldung({ ...FORMULAR, bezug: "x".repeat(81) }, "bezug")).toBe("Höchstens 80 Zeichen.")
    expect(meldung({ ...FORMULAR, branche: "x".repeat(81) }, "branche")).toBe("Höchstens 80 Zeichen.")
    expect(meldung({ ...FORMULAR, nachricht: "x".repeat(2001) }, "nachricht")).toBe("Höchstens 2000 Zeichen.")
  })
})

describe("suchauftragFelder", () => {
  it("bildet den Suchauftrag auf die erkannten Felder ab", () => {
    expect(suchauftragFelder(suchauftragSchema.parse(FORMULAR))).toEqual({
      firma: "Muster AG",
      branche: "Logistik",
      flaeche_min: 500,
      flaeche_max: 800,
      ort: "Solothurn",
      budget_pro_m2: 180,
      bezug: "ab 1.1.2027",
      nutzung: "lager",
    })
  })

  it("setzt fehlende Angaben auf null", () => {
    const s = suchauftragSchema.parse({ ...FORMULAR, branche: "", flaecheMin: "", budgetProM2: "", bezug: "" })
    expect(suchauftragFelder(s)).toMatchObject({ branche: null, flaeche_min: null, budget_pro_m2: null, bezug: null })
  })
})

describe("suchauftragNachricht", () => {
  const s = suchauftragSchema.parse({ ...FORMULAR, telefon: "032 123 45 67", nachricht: "Mit Rampe." })
  const n = suchauftragNachricht(s, "immoheart@example.ch")

  it("legt einen Website-Eingang der Kategorie Suchanfrage an", () => {
    expect(n).toMatchObject({
      richtung: "eingang",
      typ: "anfrage",
      quelle: "website",
      kategorie: "suchanfrage",
      ki_status: "fertig",
      gelesen: false,
      von: "anna@muster.ch",
      an: "immoheart@example.ch",
      betreff: "Suchauftrag: Lager in Solothurn",
    })
  })

  it("enthält alle Angaben im Text und Kontakt in den Feldern", () => {
    for (const teil of ["Muster AG", "Branche: Logistik", "Anna Muster", "032 123 45 67", "Lager", "500–800 m²", "CHF 180/m²", "ab 1.1.2027", "Mit Rampe."]) {
      expect(n.body).toContain(teil)
    }
    expect(n.erkannte_felder).toEqual({
      ...suchauftragFelder(s),
      kontakt: { name: "Anna Muster", email: "anna@muster.ch", telefon: "032 123 45 67", nachricht: "Mit Rampe." },
    })
  })
})

describe("suchauftragEntwurf", () => {
  it("fasst die Suche zusammen, ohne Platzhalter", () => {
    const e = suchauftragEntwurf(suchauftragSchema.parse(FORMULAR))
    expect(e.betreff).toBe("Re: Suchauftrag: Lager in Solothurn")
    for (const teil of ["Anna Muster", "Branche: Logistik", "500–800 m²", "Solothurn", "CHF 180/m²", "ab 1.1.2027", "passenden Objekten", "immoheart"]) {
      expect(e.body).toContain(teil)
    }
    expect(e.body).not.toMatch(/[[\]{}]|undefined|null/)
  })

  it("lässt fehlende Angaben weg und nennt eine halboffene Fläche", () => {
    const s = suchauftragSchema.parse({ ...FORMULAR, branche: "", flaecheMax: "", budgetProM2: "", bezug: "" })
    const e = suchauftragEntwurf(s)
    expect(e.body).toContain("ab 500 m²")
    expect(e.body).not.toContain("Branche")
    expect(e.body).not.toContain("Budget")
    expect(e.body).not.toContain("Bezug")
  })
})
