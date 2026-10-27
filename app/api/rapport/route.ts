import { NextResponse } from "next/server"
import { istAktivAngemeldet } from "@/lib/api/angemeldet"
import { entwurfRapportText } from "@/lib/ki/rapport"
import { holeRapportRohdaten } from "@/lib/queries/rapport"
import { bereinigeZusammenfassung } from "@/lib/rapport/bereinigen"
import { erzeugeExcel, excelUrl } from "@/lib/rapport/excel-dienst"
import { kennzahlenFuerKi } from "@/lib/rapport/kennzahlen"
import { baueRapportModell, type RapportModell } from "@/lib/rapport/modell"
import { rapportZeitraum, type RapportZeitraum } from "@/lib/rapport/zeitraum"

// Rohdaten, Gemini und Python nacheinander: mehr als die Standardlaufzeit nötig.
export const maxDuration = 120

// Python bekommt die Restzeit bis 110 s (10 s Reserve zu maxDuration), mindestens 5 s.
const BUDGET_MS = 110_000
const MIN_PYTHON_MS = 5_000

const XLSX_TYP = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
const NICHT_ERZEUGT = { fehler: "Rapport konnte nicht erzeugt werden." }

// Nur Name und Meldung loggen, nie Modell- oder Rohdaten.
function logFehler(e: unknown) {
  console.error("rapport:", e instanceof Error ? `${e.name}: ${e.message}` : "unbekannter Fehler")
}

async function baueModell(zeitraum: RapportZeitraum): Promise<RapportModell> {
  const modell = baueRapportModell(await holeRapportRohdaten(zeitraum), zeitraum)
  // Ein KI-Fehler bricht nicht ab: das Blatt "Zusammenfassung" nennt dann den Grund.
  modell.zusammenfassung = bereinigeZusammenfassung(await entwurfRapportText(kennzahlenFuerKi(modell)))
  return modell
}

// Jahresrapport (Spec §2): wird nicht gespeichert, sondern bei jedem Klick neu erzeugt.
export async function POST() {
  const start = Date.now()
  // JSON-API: 401 statt Redirect, auch für deaktivierte Konten.
  if (!(await istAktivAngemeldet())) return NextResponse.json({ fehler: "Nicht angemeldet." }, { status: 401 })
  // Früh prüfen, damit ohne Schlüssel oder Ziel weder DB noch Gemini bemüht werden.
  const url = excelUrl()
  if (!process.env.RAPPORT_SCHLUESSEL || !url) {
    console.error("rapport: RAPPORT_SCHLUESSEL oder Ziel der Python-Funktion fehlt")
    return NextResponse.json({ fehler: "Rapport ist nicht konfiguriert." }, { status: 500 })
  }

  const zeitraum = rapportZeitraum(new Date())
  let modell: RapportModell
  try {
    modell = await baueModell(zeitraum)
  } catch (e) {
    logFehler(e)
    return NextResponse.json(NICHT_ERZEUGT, { status: 500 })
  }

  let datei: Uint8Array
  try {
    datei = await erzeugeExcel(modell, url, Math.max(MIN_PYTHON_MS, BUDGET_MS - (Date.now() - start)))
  } catch (e) {
    logFehler(e)
    return NextResponse.json(NICHT_ERZEUGT, { status: 502 })
  }

  return new Response(new Blob([datei]), {
    status: 200,
    headers: {
      "Content-Type": XLSX_TYP,
      "Content-Disposition": `attachment; filename="immoheart-rapport-${zeitraum.von}-bis-${zeitraum.bis}.xlsx"`,
      "Cache-Control": "no-store",
    },
  })
}
