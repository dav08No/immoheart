import { describe, expect, it } from "vitest"
import { kiFehlerText } from "./ki-fehler"

describe("kiFehlerText", () => {
  it("meldet Überlastung als vorübergehend", () => {
    expect(kiFehlerText({ status: 503, message: "high demand" })).toBe("KI vorübergehend überlastet, bitte später erneut verarbeiten.")
  })
  it("meldet unlesbare KI-Antworten", () => {
    expect(kiFehlerText(new SyntaxError("Unexpected token"))).toBe("Unerwartete Antwort der KI.")
  })
  it("kürzt sonstige Meldungen auf 300 Zeichen", () => {
    const text = kiFehlerText(new Error("x".repeat(1000)))
    expect(text.length).toBe(300)
    expect(text.startsWith("Verarbeitung fehlgeschlagen: x")).toBe(true)
  })
  it("kommt mit Nicht-Fehlern zurecht", () => {
    expect(kiFehlerText("kaputt")).toBe("Verarbeitung fehlgeschlagen.")
  })
})
