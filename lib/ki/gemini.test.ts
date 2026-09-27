import { describe, expect, it, vi } from "vitest"
import { generiereText, istModellNichtVerfuegbar, istVoruebergehend } from "./gemini"

function fehlerMitStatus(status: number): Error {
  return Object.assign(new Error(`HTTP ${status}`), { status })
}

describe("istVoruebergehend", () => {
  it.each([503, 429, 500, 502, 504])("ist true für Status %i", (status) => {
    expect(istVoruebergehend(fehlerMitStatus(status))).toBe(true)
  })

  it.each([400, 401, 403])("ist false für Status %i", (status) => {
    expect(istVoruebergehend(fehlerMitStatus(status))).toBe(false)
  })

  it("ist false für einen Nicht-Objekt-Fehler", () => {
    expect(istVoruebergehend("kaputt")).toBe(false)
    expect(istVoruebergehend(undefined)).toBe(false)
    expect(istVoruebergehend(null)).toBe(false)
  })
})

describe("istModellNichtVerfuegbar", () => {
  it("ist true für Status 404", () => {
    expect(istModellNichtVerfuegbar(fehlerMitStatus(404))).toBe(true)
  })

  it("ist false für andere Status", () => {
    expect(istModellNichtVerfuegbar(fehlerMitStatus(503))).toBe(false)
  })
})

describe("generiereText", () => {
  it("gelingt nach einem 503 auf dem ersten Modell", async () => {
    const warte = vi.fn().mockResolvedValue(undefined)
    const erzeuge = vi
      .fn()
      .mockRejectedValueOnce(fehlerMitStatus(503))
      .mockResolvedValueOnce("Antwort")

    const ergebnis = await generiereText("Prompt", { erzeuge, warte })

    expect(ergebnis).toBe("Antwort")
    expect(erzeuge).toHaveBeenCalledTimes(2)
    expect(erzeuge).toHaveBeenNthCalledWith(1, "gemini-3.8-flash", "Prompt", 20_000)
    expect(erzeuge).toHaveBeenNthCalledWith(2, "gemini-3.8-flash", "Prompt", 20_000)
    expect(warte).toHaveBeenCalledWith(500)
  })

  it("wechselt nach 2 vorübergehenden Fehlern auf das Ersatzmodell", async () => {
    const warte = vi.fn().mockResolvedValue(undefined)
    const erzeuge = vi
      .fn()
      .mockRejectedValueOnce(fehlerMitStatus(503))
      .mockRejectedValueOnce(fehlerMitStatus(503))
      .mockResolvedValueOnce("Antwort vom Ersatzmodell")

    const ergebnis = await generiereText("Prompt", { erzeuge, warte })

    expect(ergebnis).toBe("Antwort vom Ersatzmodell")
    expect(erzeuge).toHaveBeenCalledTimes(3)
    expect(erzeuge).toHaveBeenNthCalledWith(1, "gemini-3.8-flash", "Prompt", 20_000)
    expect(erzeuge).toHaveBeenNthCalledWith(2, "gemini-3.8-flash", "Prompt", 20_000)
    expect(erzeuge).toHaveBeenNthCalledWith(3, "gemini-3.5-flash", "Prompt", 20_000)
    expect(warte).toHaveBeenCalledWith(500)
    expect(warte).toHaveBeenCalledTimes(1)
  })

  it("wechselt bei erschöpftem Kontingent (429) sofort durch die Modellkette", async () => {
    const warte = vi.fn().mockResolvedValue(undefined)
    const erzeuge = vi
      .fn()
      .mockRejectedValueOnce(fehlerMitStatus(429))
      .mockRejectedValueOnce(fehlerMitStatus(429))
      .mockRejectedValueOnce(fehlerMitStatus(429))
      .mockResolvedValueOnce("Antwort")

    const ergebnis = await generiereText("Prompt", { erzeuge, warte })

    expect(ergebnis).toBe("Antwort")
    expect(erzeuge.mock.calls.map((aufruf) => aufruf.at(0))).toEqual([
      "gemini-3.8-flash",
      "gemini-3.5-flash",
      "gemini-flash-latest",
      "gemini-flash-lite-latest",
    ])
    expect(warte).not.toHaveBeenCalled()
  })

  it("wirft bei 400 sofort, ohne Ersatzmodell zu versuchen", async () => {
    const warte = vi.fn().mockResolvedValue(undefined)
    const erzeuge = vi.fn().mockRejectedValueOnce(fehlerMitStatus(400))

    await expect(generiereText("Prompt", { erzeuge, warte })).rejects.toMatchObject({ status: 400 })
    expect(erzeuge).toHaveBeenCalledTimes(1)
    expect(warte).not.toHaveBeenCalled()
  })

  it("wechselt bei 404 sofort auf das nächste Modell", async () => {
    const warte = vi.fn().mockResolvedValue(undefined)
    const erzeuge = vi
      .fn()
      .mockRejectedValueOnce(fehlerMitStatus(404))
      .mockResolvedValueOnce("Antwort vom Ersatzmodell")

    const ergebnis = await generiereText("Prompt", { erzeuge, warte })

    expect(ergebnis).toBe("Antwort vom Ersatzmodell")
    expect(erzeuge).toHaveBeenCalledTimes(2)
    expect(erzeuge).toHaveBeenNthCalledWith(1, "gemini-3.8-flash", "Prompt", 20_000)
    expect(erzeuge).toHaveBeenNthCalledWith(2, "gemini-3.5-flash", "Prompt", 20_000)
    expect(warte).not.toHaveBeenCalled()
  })

  it("wirft den letzten Fehler, wenn alle Modelle scheitern", async () => {
    const warte = vi.fn().mockResolvedValue(undefined)
    const erzeuge = vi.fn().mockRejectedValue(fehlerMitStatus(503))

    await expect(generiereText("Prompt", { erzeuge, warte })).rejects.toMatchObject({ status: 503 })
    expect(erzeuge).toHaveBeenCalledTimes(10)
  })

  it("gibt der Anfrage nur die Restzeit und bricht ab, wenn das Gesamtbudget aufgebraucht ist", async () => {
    let uhr = 0
    const warte = vi.fn(async (ms: number) => {
      uhr += ms
    })
    // Jeder Versuch braucht 8 s und endet mit 503.
    const erzeuge = vi.fn(async () => {
      uhr += 8_000
      throw fehlerMitStatus(503)
    })

    await expect(generiereText("Prompt", { erzeuge, warte, jetzt: () => uhr })).rejects.toMatchObject({ status: 503 })

    // 0 s: 20 s Limit; 8,5 s: Rest 13,5 s; 16,5 s (Modellwechsel, ohne Warten): Rest 5,5 s; danach 24,5 s > Budget.
    expect(erzeuge.mock.calls.map((aufruf) => aufruf.at(2))).toEqual([20_000, 13_500, 5_500])
  })
})
