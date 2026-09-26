import { describe, expect, it } from "vitest"
import { passwortFehlerText } from "./passwort-fehler"

describe("passwortFehlerText", () => {
  it("meldet, wenn das neue Passwort dem alten entspricht", () => {
    expect(passwortFehlerText("same_password")).toBe("Das neue Passwort muss sich vom bisherigen unterscheiden.")
  })

  it("meldet ein zu schwaches Passwort", () => {
    expect(passwortFehlerText("weak_password")).toBe("Das Passwort ist zu schwach.")
  })

  it("bittet bei abgelaufener Sitzung um erneutes Anmelden", () => {
    expect(passwortFehlerText("reauthentication_needed")).toBe(
      "Bitte melden Sie sich erneut an und versuchen Sie es nochmals."
    )
  })

  it("liefert eine generische Meldung für unbekannte Codes", () => {
    expect(passwortFehlerText("irgendein_anderer_code")).toBe("Passwort konnte nicht gespeichert werden.")
  })

  it("liefert eine generische Meldung, wenn kein Code vorhanden ist", () => {
    expect(passwortFehlerText(undefined)).toBe("Passwort konnte nicht gespeichert werden.")
  })
})
