import { describe, expect, it } from "vitest"
import { istAdminPfad, istGleicherUrsprung, linkTyp, loginHinweis, loginZielNachAbmelden } from "./routen"

describe("istAdminPfad", () => {
  it("erkennt /admin und alles darunter", () => {
    expect(istAdminPfad("/admin")).toBe(true)
    expect(istAdminPfad("/admin/")).toBe(true)
    expect(istAdminPfad("/admin/postfach")).toBe(true)
    expect(istAdminPfad("/admin/objekte/123")).toBe(true)
  })

  it("lässt ähnliche, aber andere Pfade durch", () => {
    expect(istAdminPfad("/administration")).toBe(false)
    expect(istAdminPfad("/adminx")).toBe(false)
    expect(istAdminPfad("/")).toBe(false)
    expect(istAdminPfad("/objekte")).toBe(false)
    expect(istAdminPfad("/login")).toBe(false)
  })

  it("ist nicht über Grossschreibung zu umgehen", () => {
    expect(istAdminPfad("/Admin")).toBe(true)
    expect(istAdminPfad("/ADMIN/postfach")).toBe(true)
  })
})

describe("loginZielNachAbmelden", () => {
  it("hängt den Grund bei exaktem Treffer 'inaktiv' an", () => {
    expect(loginZielNachAbmelden("inaktiv")).toBe("/login?grund=inaktiv")
  })

  it("verwirft alles, was nicht exakt 'inaktiv' ist", () => {
    expect(loginZielNachAbmelden(null)).toBe("/login")
    expect(loginZielNachAbmelden("")).toBe("/login")
    expect(loginZielNachAbmelden("INAKTIV")).toBe("/login")
    expect(loginZielNachAbmelden("inaktiv ")).toBe("/login")
    expect(loginZielNachAbmelden("<script>")).toBe("/login")
  })
})

describe("linkTyp", () => {
  it("akzeptiert nur invite und recovery exakt", () => {
    expect(linkTyp("invite")).toBe("invite")
    expect(linkTyp("recovery")).toBe("recovery")
    expect(linkTyp("INVITE")).toBeNull()
    expect(linkTyp("signup")).toBeNull()
    expect(linkTyp(null)).toBeNull()
  })
})

describe("loginHinweis", () => {
  it("liefert nur feste Texte für bekannte Gründe", () => {
    expect(loginHinweis("inaktiv")).toBe("Dieses Konto ist deaktiviert.")
    expect(loginHinweis("link-ungueltig")).toBe("Der Link ist ungültig oder abgelaufen.")
    expect(loginHinweis("passwort-gesetzt")).toBe("Passwort gespeichert. Bitte melden Sie sich an.")
    expect(loginHinweis("<script>")).toBeNull()
    expect(loginHinweis("toString")).toBeNull()
    expect(loginHinweis(null)).toBeNull()
  })
})

describe("istGleicherUrsprung", () => {
  it("vergleicht Origin und Anfrage-URL nur über den Host", () => {
    expect(
      istGleicherUrsprung("https://immoheart.vercel.app", "https://immoheart.vercel.app/auth/bestaetigen/einloesen")
    ).toBe(true)
    expect(
      istGleicherUrsprung("https://evil.example.com", "https://immoheart.vercel.app/auth/bestaetigen/einloesen")
    ).toBe(false)
    expect(istGleicherUrsprung(null, "https://immoheart.vercel.app/auth/bestaetigen/einloesen")).toBe(false)
    expect(istGleicherUrsprung("nicht-eine-url", "https://immoheart.vercel.app/auth/bestaetigen/einloesen")).toBe(
      false
    )
  })
})
