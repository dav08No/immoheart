import { describe, expect, it } from "vitest"
import { zeigeMailToast } from "./neue-mails-ereignis"

describe("zeigeMailToast", () => {
  it("zeigt den Toast auf anderen Admin-Seiten", () => {
    expect(zeigeMailToast("/admin")).toBe(true)
    expect(zeigeMailToast("/admin/entwuerfe")).toBe(true)
  })

  it("unterdrückt den Toast im Postfach selbst (der Herzschlag genügt dort)", () => {
    expect(zeigeMailToast("/admin/postfach")).toBe(false)
  })

  it("unterdrückt den Toast auch auf Unterseiten des Postfachs", () => {
    expect(zeigeMailToast("/admin/postfach/123")).toBe(false)
  })
})
