import { describe, expect, it } from "vitest"
import { einladungsMail, escapeHtml, passwortResetMail } from "./vorlagen"

describe("escapeHtml", () => {
  it("maskiert alle HTML-relevanten Zeichen", () => {
    expect(escapeHtml(`<script>alert("x") & 'y'</script>`)).toBe(
      "&lt;script&gt;alert(&quot;x&quot;) &amp; &#39;y&#39;&lt;/script&gt;"
    )
  })
})

describe("einladungsMail", () => {
  const link = "https://immoheart.vercel.app/auth/bestaetigen?token_hash=abc&typ=invite"

  it("enthält Name und Link in Text und HTML", () => {
    const mail = einladungsMail("Anna Muster", link)
    expect(mail.betreff).toBe("Einladung zu immoheart")
    expect(mail.text).toContain("Anna Muster")
    expect(mail.text).toContain(link)
    expect(mail.html).toContain(`href="${escapeHtml(link)}"`)
  })

  it("escaped den Namen im HTML", () => {
    const mail = einladungsMail("<b>Evil</b>", link)
    expect(mail.html).not.toContain("<b>Evil</b>")
    expect(mail.html).toContain("&lt;b&gt;Evil&lt;/b&gt;")
  })
})

describe("passwortResetMail", () => {
  it("enthält den Link und den festen Betreff", () => {
    const link = "https://immoheart.vercel.app/auth/bestaetigen?token_hash=xyz&typ=recovery"
    const mail = passwortResetMail(link)
    expect(mail.betreff).toBe("Passwort für immoheart zurücksetzen")
    expect(mail.text).toContain(link)
    expect(mail.html).toContain(`href="${escapeHtml(link)}"`)
  })
})
