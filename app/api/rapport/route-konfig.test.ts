// Ziel-URL, Zeitbudget und Fehlerpfade der Rapport-Route (Final-Review I2, I3, I5).
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { BEISPIEL_JETZT, BEISPIEL_ROHDATEN } from "@/lib/rapport/beispiel-daten"
import type { RapportModell } from "@/lib/rapport/typen"

const getUser = vi.fn()
const holeRohdaten = vi.fn()
const entwurf = vi.fn()
const fetchMock = vi.fn()

vi.mock("@/lib/supabase/server", () => ({
  erstelleServerClient: async () => ({
    auth: { getUser },
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { aktiv: true }, error: null }) }) }) }),
  }),
}))
vi.mock("@/lib/queries/rapport", () => ({ holeRapportRohdaten: (z: unknown) => holeRohdaten(z) }))
vi.mock("@/lib/ki/rapport", () => ({ entwurfRapportText: (e: unknown) => entwurf(e) }))

import { POST } from "./route"

const TEXT = { rueckblick: "R", trends: "T", auffaelligkeiten: "A", ausblick: "O" }
const gesendet = () => fetchMock.mock.calls[0] as [string, RequestInit]

describe("POST /api/rapport: Konfiguration und Fehler", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] })
    vi.setSystemTime(BEISPIEL_JETZT)
    vi.stubGlobal("fetch", fetchMock)
    vi.stubEnv("RAPPORT_SCHLUESSEL", "geheim")
    vi.stubEnv("RAPPORT_EXCEL_URL", undefined)
    vi.stubEnv("VERCEL_URL", undefined)
    vi.stubEnv("VERCEL_ENV", undefined)
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", undefined)
    vi.stubEnv("VERCEL_AUTOMATION_BYPASS_SECRET", undefined)
    vi.spyOn(console, "error").mockImplementation(() => {})
    getUser.mockResolvedValue({ data: { user: { id: "u1" } } })
    holeRohdaten.mockResolvedValue(BEISPIEL_ROHDATEN)
    entwurf.mockResolvedValue({ text: TEXT })
    fetchMock.mockResolvedValue(new Response(new Uint8Array([0x50, 0x4b]), { status: 200 }))
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
    fetchMock.mockReset()
    holeRohdaten.mockReset()
    entwurf.mockReset()
  })

  it("1. nimmt RAPPORT_EXCEL_URL zuerst", async () => {
    vi.stubEnv("RAPPORT_EXCEL_URL", "https://excel.example/x")
    vi.stubEnv("VERCEL_URL", "immoheart-abc.vercel.app")
    expect((await POST()).status).toBe(200)
    expect(gesendet()[0]).toBe("https://excel.example/x")
  })

  it("2. in Produktion die Produktions-Domain statt der geschützten Deployment-URL", async () => {
    vi.stubEnv("VERCEL_ENV", "production")
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "immoheart.vercel.app")
    vi.stubEnv("VERCEL_URL", "immoheart-abc.vercel.app")
    vi.stubEnv("NODE_ENV", "production")
    expect((await POST()).status).toBe(200)
    expect(gesendet()[0]).toBe("https://immoheart.vercel.app/api/rapport_excel")
  })

  it("3. auf Previews die eigene Deployment-URL, auch wenn die Produktions-Domain bekannt ist", async () => {
    vi.stubEnv("VERCEL_ENV", "preview")
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "immoheart.vercel.app")
    vi.stubEnv("VERCEL_URL", "immoheart-abc.vercel.app")
    vi.stubEnv("NODE_ENV", "production")
    expect((await POST()).status).toBe(200)
    expect(gesendet()[0]).toBe("https://immoheart-abc.vercel.app/api/rapport_excel")
  })

  it("3b. in Produktion ohne Produktions-Domain die Deployment-URL", async () => {
    vi.stubEnv("VERCEL_ENV", "production")
    vi.stubEnv("VERCEL_URL", "immoheart-abc.vercel.app")
    vi.stubEnv("NODE_ENV", "production")
    expect((await POST()).status).toBe(200)
    expect(gesendet()[0]).toBe("https://immoheart-abc.vercel.app/api/rapport_excel")
  })

  it("4. sonst ausserhalb von Produktion die lokale Python-Funktion", async () => {
    vi.stubEnv("NODE_ENV", "development")
    expect((await POST()).status).toBe(200)
    expect(gesendet()[0]).toBe("http://127.0.0.1:8001")
  })

  it("5. sonst in Produktion 500, ohne DB, KI oder Python", async () => {
    vi.stubEnv("NODE_ENV", "production")
    const res = await POST()
    expect(res.status).toBe(500)
    expect(await res.json()).toEqual({ fehler: "Rapport ist nicht konfiguriert." })
    expect(holeRohdaten).not.toHaveBeenCalled()
    expect(entwurf).not.toHaveBeenCalled()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("gibt Python die Restzeit bis 110 s", async () => {
    const timeout = vi.spyOn(AbortSignal, "timeout")
    await POST()
    expect(timeout).toHaveBeenCalledWith(110_000)
  })

  it("gibt Python mindestens 5 s, auch wenn DB und KI lange brauchen", async () => {
    const timeout = vi.spyOn(AbortSignal, "timeout")
    entwurf.mockImplementation(async () => {
      vi.setSystemTime(BEISPIEL_JETZT.getTime() + 108_000)
      return { text: TEXT }
    })
    await POST()
    expect(timeout).toHaveBeenCalledWith(5_000)
  })

  it("antwortet bei DB-Fehler mit JSON 500 und loggt nur Name und Meldung", async () => {
    holeRohdaten.mockRejectedValue(new Error("Rapport-Rohdaten: Verbindung weg"))
    const res = await POST()
    expect(res.status).toBe(500)
    expect(await res.json()).toEqual({ fehler: "Rapport konnte nicht erzeugt werden." })
    expect(console.error).toHaveBeenCalledWith("rapport:", "Error: Rapport-Rohdaten: Verbindung weg")
    expect(entwurf).not.toHaveBeenCalled()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("bereinigt den KI-Text, bevor er an Python geht", async () => {
    entwurf.mockResolvedValue({ fehler: `KI\x0b${"x".repeat(600)}` })
    await POST()
    const modell = JSON.parse(String(gesendet()[1].body)) as RapportModell
    expect(modell.zusammenfassung).toEqual({ fehler: `KI${"x".repeat(498)}` })
  })
})
