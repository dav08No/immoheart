import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { ExcelFehler, erzeugeExcel } from "./excel-dienst"
import type { RapportModell } from "./typen"

const fetchMock = vi.fn()
const MODELL = { zeitraum: { label: "x", von: "2025-10-27", bis: "2026-10-27" } } as RapportModell
const URL_PY = "http://127.0.0.1:8001/api/rapport_excel"
const aufrufArgs = () => fetchMock.mock.calls[0] as [string, RequestInit]

describe("erzeugeExcel", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock)
    vi.stubEnv("RAPPORT_SCHLUESSEL", "geheim")
    vi.stubEnv("VERCEL_AUTOMATION_BYPASS_SECRET", undefined)
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
    fetchMock.mockReset()
  })

  it("sendet das Modell als JSON mit Schlüssel und Zeitlimit und liefert die Bytes", async () => {
    fetchMock.mockResolvedValue(new Response(new Uint8Array([1, 2, 3]), { status: 200 }))
    expect(await erzeugeExcel(MODELL, URL_PY)).toEqual(new Uint8Array([1, 2, 3]))
    const [url, init] = aufrufArgs()
    expect(url).toBe(URL_PY)
    expect(init.method).toBe("POST")
    expect(init.headers).toEqual({ "content-type": "application/json", "x-rapport-schluessel": "geheim" })
    expect(JSON.parse(String(init.body))).toEqual(MODELL)
    expect(init.signal).toBeInstanceOf(AbortSignal)
  })

  it("sendet den Vercel-Bypass nur, wenn er gesetzt ist", async () => {
    vi.stubEnv("VERCEL_AUTOMATION_BYPASS_SECRET", "b")
    fetchMock.mockResolvedValue(new Response(new Uint8Array([1]), { status: 200 }))
    await erzeugeExcel(MODELL, URL_PY)
    expect(aufrufArgs()[1].headers).toMatchObject({ "x-vercel-protection-bypass": "b" })
  })

  it("wirft ohne Schlüssel, ohne Aufruf", async () => {
    vi.stubEnv("RAPPORT_SCHLUESSEL", "")
    await expect(erzeugeExcel(MODELL, URL_PY)).rejects.toBeInstanceOf(ExcelFehler)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("wirft bei Status ungleich 200 mit Status und gekürztem Text", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ fehler: "x".repeat(500) }), { status: 413 }))
    const fehler: unknown = await erzeugeExcel(MODELL, URL_PY).catch((e: unknown) => e)
    expect(fehler).toBeInstanceOf(ExcelFehler)
    const grund = (fehler as ExcelFehler).grund
    expect(grund.startsWith("Status 413")).toBe(true)
    expect(grund.length).toBeLessThanOrEqual("Status 413 ".length + 200)
  })

  it("wirft bei Netzwerkfehler oder Zeitüberschreitung", async () => {
    fetchMock.mockRejectedValue(new DOMException("abgelaufen", "TimeoutError"))
    await expect(erzeugeExcel(MODELL, URL_PY)).rejects.toThrow(/TimeoutError/)
    fetchMock.mockRejectedValue(new TypeError("fetch failed"))
    await expect(erzeugeExcel(MODELL, URL_PY)).rejects.toThrow(/TypeError/)
  })
})
