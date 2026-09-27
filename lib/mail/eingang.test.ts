import { describe, expect, it } from "vitest"
import {
  ERLAUBTE_ANHANG_TYPEN,
  MAX_ANHANG_BYTES,
  absender,
  anhangErlaubt,
  htmlZuText,
  referenzListe,
  sichererDateiname,
} from "./eingang"

describe("htmlZuText", () => {
  it("entfernt script-Blöcke samt Inhalt", () => {
    expect(htmlZuText("<script>alert(1)</script>Hallo")).toBe("Hallo")
  })

  it("entfernt style-Blöcke samt Inhalt", () => {
    expect(htmlZuText("<style>body{color:red}</style>Hallo")).toBe("Hallo")
  })

  it("ersetzt Absatz-/Zeilenumbruch-Tags durch Zeilenumbrüche", () => {
    expect(htmlZuText("<p>A</p><p>B</p>")).toBe("A\nB")
    expect(htmlZuText("Zeile1<br>Zeile2")).toBe("Zeile1\nZeile2")
    expect(htmlZuText("<div>A</div><div>B</div>")).toBe("A\nB")
    expect(htmlZuText("<ul><li>A</li><li>B</li></ul>")).toBe("A\nB")
  })

  it("dekodiert HTML-Entities", () => {
    expect(htmlZuText("Preis &amp; Miete &lt;b&gt; &quot;fix&quot; &#39;x&#39;&nbsp;Ende")).toBe(
      `Preis & Miete <b> "fix" 'x' Ende`
    )
  })

  it("entfernt alle übrigen Tags", () => {
    expect(htmlZuText('<a href="x">Link</a>')).toBe("Link")
    expect(htmlZuText("<b>fett</b>")).not.toMatch(/[<>]/)
  })

  it("fasst 3 oder mehr Leerzeilen zu 2 zusammen", () => {
    expect(htmlZuText("A\n\n\n\nB")).toBe("A\n\nB")
  })

  it("trimmt das Ergebnis", () => {
    expect(htmlZuText("  <p>Hallo</p>  ")).toBe("Hallo")
  })
})

describe("anhangErlaubt", () => {
  it("erlaubt jpeg bis 1 MB", () => {
    expect(anhangErlaubt("image/jpeg", 1024 * 1024)).toBe(true)
  })

  it("vergleicht den Typ klein geschrieben", () => {
    expect(anhangErlaubt("IMAGE/PNG", 1024)).toBe(true)
  })

  it("erlaubt webp bis 1 MB", () => {
    expect(anhangErlaubt("image/webp", 1024 * 1024)).toBe(true)
  })

  it("erlaubt heic bis 1 MB", () => {
    expect(anhangErlaubt("image/heic", 1024 * 1024)).toBe(true)
  })

  it("erlaubt pdf bis genau 10 MB", () => {
    expect(anhangErlaubt("application/pdf", MAX_ANHANG_BYTES)).toBe(true)
  })

  it("lehnt pdf über 10 MB ab", () => {
    expect(anhangErlaubt("application/pdf", MAX_ANHANG_BYTES + 1)).toBe(false)
  })

  it("lehnt nicht erlaubte Typen ab", () => {
    expect(anhangErlaubt("application/zip", 1024)).toBe(false)
  })

  it("exportiert die erlaubten Typen als Liste", () => {
    expect(ERLAUBTE_ANHANG_TYPEN.length).toBeGreaterThan(0)
  })
})

describe("sichererDateiname", () => {
  it("entfernt Pfadtrenner, keine Traversierung möglich", () => {
    const ergebnis = sichererDateiname("../../etc/passwd", 0)
    expect(ergebnis).not.toContain("/")
    expect(ergebnis).not.toContain("\\")
  })

  it("ersetzt Leerzeichen durch Unterstrich", () => {
    expect(sichererDateiname("Grundriss 1.pdf", 1)).toBe("Grundriss_1.pdf")
  })

  it("liefert einen Fallback-Namen ohne Eingabe", () => {
    expect(sichererDateiname(undefined, 2)).toBe("anhang-2")
    expect(sichererDateiname("", 3)).toBe("anhang-3")
  })

  it("kürzt sehr lange Namen auf 80 Zeichen und behält die Endung", () => {
    const ergebnis = sichererDateiname("a".repeat(196) + ".pdf", 4)
    expect(ergebnis.length).toBeLessThanOrEqual(80)
    expect(ergebnis.endsWith(".pdf")).toBe(true)
  })
})

describe("referenzListe", () => {
  it("kombiniert In-Reply-To und References ohne Duplikate", () => {
    expect(referenzListe("<a@x>", "<a@x> <b@x>")).toEqual(["<a@x>", "<b@x>"])
  })

  it("akzeptiert References als Array", () => {
    expect(referenzListe(undefined, ["<a@x>", "<b@x>"])).toEqual(["<a@x>", "<b@x>"])
  })

  it("liefert eine leere Liste ohne Header", () => {
    expect(referenzListe(undefined, undefined)).toEqual([])
  })
})

describe("absender", () => {
  it("liefert Adresse klein geschrieben und Namen", () => {
    expect(absender({ value: [{ address: "Info@Beispiel.CH", name: "Frau Muster" }] })).toEqual({
      adresse: "info@beispiel.ch",
      name: "Frau Muster",
    })
  })

  it("liefert null bei fehlendem Absender", () => {
    expect(absender(undefined)).toBeNull()
    expect(absender({ value: [] })).toBeNull()
    expect(absender({ value: [{ name: "Ohne Adresse" }] })).toBeNull()
  })
})
