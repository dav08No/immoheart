import { describe, expect, it } from "vitest"
import { istAdminPfad } from "./routen"

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
