// Aufruf der Python-Funktion api/rapport_excel.py: JSON-Modell rein, .xlsx-Bytes raus.
// Getrennt von der Route, damit diese dünn und der Aufruf einzeln testbar bleibt.
import type { RapportModell } from "./typen"

// 90 s: unter maxDuration (120 s) der Route, damit sie noch sauber mit 502 antworten kann.
const ZEITLIMIT_MS = 90_000

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

export async function erzeugeExcel(modell: RapportModell, url: string): Promise<Uint8Array> {
  const schluessel = process.env.RAPPORT_SCHLUESSEL
  // Die Route prüft das schon vorher (500); hier nur als Absicherung, ohne Aufruf.
  if (!schluessel) throw new ExcelFehler("RAPPORT_SCHLUESSEL fehlt")

  let antwort: Response
  try {
    antwort = await fetch(url, {
      method: "POST",
      headers: kopfzeilen(schluessel),
      body: JSON.stringify(modell),
      signal: AbortSignal.timeout(ZEITLIMIT_MS),
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
