import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { BEISPIEL_JETZT, BEISPIEL_ROHDATEN } from "@/lib/rapport/beispiel-daten"
import type { RapportModell } from "@/lib/rapport/typen"

const getUser = vi.fn()
const profil = vi.fn()
const holeRohdaten = vi.fn()
const entwurf = vi.fn()
const fetchMock = vi.fn()

vi.mock("@/lib/supabase/server", () => ({
  erstelleServerClient: async () => ({
    auth: { getUser },
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: () => profil() }) }) }),
  }),
}))
vi.mock("@/lib/queries/rapport", () => ({ holeRapportRohdaten: (z: unknown) => holeRohdaten(z) }))
vi.mock("@/lib/ki/rapport", () => ({ entwurfRapportText: (e: unknown) => entwurf(e) }))

import { POST } from "./route"

const XLSX = new Uint8Array([0x50, 0x4b, 3, 4])
const TEXT = { rueckblick: "R", trends: "T", auffaelligkeiten: "A", ausblick: "O" }
const aufruf = () => POST()
const gesendet = () => fetchMock.mock.calls[0] as [string, RequestInit]
const gesendetesModell = (): RapportModell => JSON.parse(String(gesendet()[1].body)) as RapportModell

describe("POST /api/rapport", () => {
  beforeEach(() => {
    // Nur Date fälschen: AbortSignal.timeout soll echt bleiben.
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
    profil.mockResolvedValue({ data: { aktiv: true }, error: null })
    holeRohdaten.mockResolvedValue(BEISPIEL_ROHDATEN)
    entwurf.mockResolvedValue({ text: TEXT })
    fetchMock.mockResolvedValue(new Response(XLSX, { status: 200 }))
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

  it("antwortet ohne Sitzung mit 401 und ruft weder DB, KI noch Python auf", async () => {
    getUser.mockResolvedValue({ data: { user: null } })
    const res = await aufruf()
    expect(res.status).toBe(401)
    expect(await res.json()).toEqual({ fehler: "Nicht angemeldet." })
    expect(holeRohdaten).not.toHaveBeenCalled()
    expect(entwurf).not.toHaveBeenCalled()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("antwortet mit deaktiviertem Konto mit 401", async () => {
    profil.mockResolvedValue({ data: null, error: null })
    expect((await aufruf()).status).toBe(401)
    profil.mockResolvedValue({ data: { aktiv: false }, error: null })
    expect((await aufruf()).status).toBe(401)
    expect(holeRohdaten).not.toHaveBeenCalled()
  })

  it("antwortet ohne Schlüssel mit 500 und ruft weder KI noch Python auf", async () => {
    vi.stubEnv("RAPPORT_SCHLUESSEL", "")
    const res = await aufruf()
    expect(res.status).toBe(500)
    expect(await res.json()).toEqual({ fehler: "Rapport ist nicht konfiguriert." })
    expect(fetchMock).not.toHaveBeenCalled()
    expect(entwurf).not.toHaveBeenCalled()
  })

  it("liefert die Datei mit Dateiname aus dem Zeitraum", async () => {
    const res = await aufruf()
    expect(res.status).toBe(200)
    expect(res.headers.get("content-type")).toBe("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
    expect(res.headers.get("content-disposition")).toBe('attachment; filename="immoheart-rapport-2025-10-27-bis-2026-10-27.xlsx"')
    expect(res.headers.get("cache-control")).toBe("no-store")
    expect(new Uint8Array(await res.arrayBuffer())).toEqual(XLSX)

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = gesendet()
    // Ausserhalb von Produktion ohne Konfiguration: lokale Python-Funktion.
    expect(url).toBe("http://127.0.0.1:8001")
    expect(init.headers).toEqual({ "content-type": "application/json", "x-rapport-schluessel": "geheim" })
    const modell = gesendetesModell()
    expect(modell.zeitraum).toEqual({ label: "27.10.2025 – 27.10.2026", von: "2025-10-27", bis: "2026-10-27" })
    expect(modell.zusammenfassung).toEqual({ text: TEXT })
    expect(entwurf).toHaveBeenCalledTimes(1)
  })

  it("nutzt RAPPORT_EXCEL_URL und sendet den Bypass, wenn gesetzt", async () => {
    vi.stubEnv("RAPPORT_EXCEL_URL", "https://excel.example/api/rapport_excel")
    vi.stubEnv("VERCEL_URL", "immoheart-abc.vercel.app")
    vi.stubEnv("VERCEL_AUTOMATION_BYPASS_SECRET", "bypass")
    expect((await aufruf()).status).toBe(200)
    const [url, init] = gesendet()
    expect(url).toBe("https://excel.example/api/rapport_excel")
    expect(init.headers).toMatchObject({ "x-vercel-protection-bypass": "bypass" })
  })

  it("liefert die Datei auch bei KI-Fehler, mit Grund im Modell", async () => {
    entwurf.mockResolvedValue({ fehler: "KI vorübergehend überlastet" })
    const res = await aufruf()
    expect(res.status).toBe(200)
    expect(gesendetesModell().zusammenfassung).toEqual({ fehler: "KI vorübergehend überlastet" })
  })

  it("antwortet bei Python-Fehler mit 502", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ fehler: "Ungültiges Modell (kennzahlen)" }), { status: 400 }))
    const res = await aufruf()
    expect(res.status).toBe(502)
    expect(await res.json()).toEqual({ fehler: "Rapport konnte nicht erzeugt werden." })
  })

  it("antwortet bei Zeitüberschreitung mit 502", async () => {
    fetchMock.mockRejectedValue(new DOMException("Zeit abgelaufen", "TimeoutError"))
    const res = await aufruf()
    expect(res.status).toBe(502)
    expect(await res.json()).toEqual({ fehler: "Rapport konnte nicht erzeugt werden." })
  })
})
