// Aufruf der Python-Funktion api/rapport_excel.py: JSON-Modell rein, .xlsx-Bytes raus.
// Getrennt von der Route, damit diese dünn und der Aufruf einzeln testbar bleibt.
import type { RapportModell } from "./typen"

// Ziel nur aus der Umgebung, nie aus request.url: sonst ginge der Schlüssel an einen Host,
// den der Aufrufer über den Host-Header wählt. null = nicht konfiguriert.
export function excelUrl(): string | null {
  if (process.env.RAPPORT_EXCEL_URL) return process.env.RAPPORT_EXCEL_URL
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}/api/rapport_excel`
  // Lokal läuft die Python-Funktion separat (python api/rapport_excel.py, Port 8001).
  if (process.env.NODE_ENV !== "production") return "http://127.0.0.1:8001"
  return null
}

export class ExcelFehler extends Error {
  // Nur Status und Kurzgrund, nie Modelldaten: die Meldung landet im Log.
  constructor(public readonly grund: string) {
    super(`Rapport-Excel fehlgeschlagen: ${grund}`)
    this.name = "ExcelFehler"
  }
}

function kopfzeilen(schluessel: string): Record<string, string> {
  const kopf: Record<string, string> = { "content-type": "application/json", "x-rapport-schluessel": schluessel }
  // Auf geschützten Previews blockiert Vercel sonst den internen Aufruf mit 401.
  const umgehung = process.env.VERCEL_AUTOMATION_BYPASS_SECRET
  if (umgehung) kopf["x-vercel-protection-bypass"] = umgehung
  return kopf
}

// zeitlimitMs: Restzeit der Route (maxDuration), damit sie noch sauber mit 502 antworten kann.
export async function erzeugeExcel(modell: RapportModell, url: string, zeitlimitMs: number): Promise<Uint8Array> {
  const schluessel = process.env.RAPPORT_SCHLUESSEL
  // Die Route prüft das schon vorher (500); hier nur als Absicherung, ohne Aufruf.
  if (!schluessel) throw new ExcelFehler("RAPPORT_SCHLUESSEL fehlt")

  let antwort: Response
  try {
    antwort = await fetch(url, {
      method: "POST",
      headers: kopfzeilen(schluessel),
      body: JSON.stringify(modell),
      signal: AbortSignal.timeout(zeitlimitMs),
      cache: "no-store",
    })
  } catch (e) {
    throw new ExcelFehler(e instanceof Error ? e.name : "Netzwerkfehler")
  }

  if (antwort.status !== 200) {
    // Python-Fehler nennen nur Feldpfade, keine Werte; gekürzt trotzdem.
    const text = await antwort.text().catch(() => "")
    throw new ExcelFehler(`Status ${antwort.status} ${text.slice(0, 200)}`.trim())
  }
  return new Uint8Array(await antwort.arrayBuffer())
}
