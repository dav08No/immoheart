import { describe, expect, it } from "vitest"
import {
  ERLAUBTE_ANHANG_TYPEN,
  MAX_ANHANG_BYTES,
  absender,
  anhangErlaubt,
  eingangFelderAusMail,
  htmlZuText,
  referenzListe,
  sichererDateiname,
  type GeparsteMail,
} from "./eingang"

const LEERE_MAIL: GeparsteMail = {
  messageId: undefined,
  inReplyTo: undefined,
  references: undefined,
  from: undefined,
  subject: undefined,
  text: undefined,
  html: false,
  date: undefined,
}

describe("htmlZuText", () => {
  it("entfernt script-Blöcke samt Inhalt", () => {
    expect(htmlZuText("<script>alert(1)</script>Hallo")).toBe("Hallo")
  })

  it("entfernt style-Blöcke samt Inhalt", () => {
    expect(htmlZuText("<style>body{color:red}</style>Hallo")).toBe("Hallo")
  })

  it("entfernt ein ungeschlossenes script-Tag samt allem danach", () => {
    expect(htmlZuText("Hallo<script>alert(1)")).toBe("Hallo")
  })

  it("entfernt ein ungeschlossenes style-Tag samt allem danach", () => {
    expect(htmlZuText('<STYLE type="x">a{}')).toBe("")
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

  it("liefert einen Fallback-Namen, wenn nach der Bereinigung nur Punkte übrig bleiben", () => {
    expect(sichererDateiname(".", 5)).toBe("anhang-5")
    expect(sichererDateiname("..", 6)).toBe("anhang-6")
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

describe("eingangFelderAusMail", () => {
  it("bevorzugt den Klartext-Body vor der HTML-Umwandlung", () => {
    const felder = eingangFelderAusMail({ ...LEERE_MAIL, text: "Klartext", html: "<p>HTML</p>" })
    expect(felder.body).toBe("Klartext")
  })

  it("wandelt HTML in Text um, wenn kein Klartext vorhanden ist", () => {
    const felder = eingangFelderAusMail({ ...LEERE_MAIL, text: undefined, html: "<p>Nur HTML</p>" })
    expect(felder.body).toBe("Nur HTML")
  })

  it("kürzt den Body auf 50000 Zeichen", () => {
    const felder = eingangFelderAusMail({ ...LEERE_MAIL, text: "x".repeat(50_010) })
    expect(felder.body.length).toBe(50_000)
  })

  it("fällt bei fehlendem Betreff auf '(ohne Betreff)' zurück", () => {
    expect(eingangFelderAusMail({ ...LEERE_MAIL, subject: undefined }).betreff).toBe("(ohne Betreff)")
    expect(eingangFelderAusMail({ ...LEERE_MAIL, subject: "  " }).betreff).toBe("(ohne Betreff)")
  })

  it("trimmt einen vorhandenen Betreff", () => {
    expect(eingangFelderAusMail({ ...LEERE_MAIL, subject: "  Anfrage  " }).betreff).toBe("Anfrage")
  })

  it("fällt bei fehlendem Absender auf 'unbekannt' zurück", () => {
    expect(eingangFelderAusMail({ ...LEERE_MAIL, from: undefined }).von).toBe("unbekannt")
  })

  it("übernimmt die Absenderadresse klein geschrieben", () => {
    const felder = eingangFelderAusMail({ ...LEERE_MAIL, from: { value: [{ address: "Firma@Beispiel.CH" }] } })
    expect(felder.von).toBe("firma@beispiel.ch")
  })

  it("übernimmt message_id unverändert und liefert null ohne Header", () => {
    expect(eingangFelderAusMail({ ...LEERE_MAIL, messageId: "<a@x>" }).message_id).toBe("<a@x>")
    expect(eingangFelderAusMail(LEERE_MAIL).message_id).toBeNull()
  })

  it("extrahiert die erste Id aus In-Reply-To", () => {
    const felder = eingangFelderAusMail({ ...LEERE_MAIL, inReplyTo: "<a@x> <b@x>" })
    expect(felder.in_reply_to).toBe("<a@x>")
  })

  it("liefert null für in_reply_to ohne Header", () => {
    expect(eingangFelderAusMail(LEERE_MAIL).in_reply_to).toBeNull()
  })

  it("kombiniert In-Reply-To und References zu referenzen, space-getrennt", () => {
    const felder = eingangFelderAusMail({ ...LEERE_MAIL, inReplyTo: "<a@x>", references: "<a@x> <b@x>" })
    expect(felder.referenzen).toBe("<a@x> <b@x>")
  })

  it("liefert null für referenzen ohne Header", () => {
    expect(eingangFelderAusMail(LEERE_MAIL).referenzen).toBeNull()
  })

  it("formatiert empfangen_am als ISO-String, sonst null", () => {
    const datum = new Date("2026-01-02T03:04:05.000Z")
    expect(eingangFelderAusMail({ ...LEERE_MAIL, date: datum }).empfangen_am).toBe(datum.toISOString())
    expect(eingangFelderAusMail(LEERE_MAIL).empfangen_am).toBeNull()
  })
})
