import { NextResponse } from "next/server"
import { istAktivAngemeldet } from "@/lib/api/angemeldet"
import { entwurfRapportText } from "@/lib/ki/rapport"
import { holeRapportRohdaten } from "@/lib/queries/rapport"
import { erzeugeExcel } from "@/lib/rapport/excel-dienst"
import { kennzahlenFuerKi } from "@/lib/rapport/kennzahlen"
import { baueRapportModell } from "@/lib/rapport/modell"
import { rapportZeitraum } from "@/lib/rapport/zeitraum"

// Rohdaten, Gemini und Python nacheinander: mehr als die Standardlaufzeit nötig.
export const maxDuration = 120

const XLSX_TYP = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"

// Jahresrapport (Spec §2): wird nicht gespeichert, sondern bei jedem Klick neu erzeugt.
export async function POST(request: Request) {
  // JSON-API: 401 statt Redirect, auch für deaktivierte Konten.
  if (!(await istAktivAngemeldet())) return NextResponse.json({ fehler: "Nicht angemeldet." }, { status: 401 })
  // Früh prüfen, damit ohne Schlüssel weder DB noch Gemini bemüht werden.
  if (!process.env.RAPPORT_SCHLUESSEL) {
    console.error("rapport: RAPPORT_SCHLUESSEL ist nicht gesetzt")
    return NextResponse.json({ fehler: "Rapport ist nicht konfiguriert." }, { status: 500 })
  }

  const zeitraum = rapportZeitraum(new Date())
  const roh = await holeRapportRohdaten(zeitraum)
  const modell = baueRapportModell(roh, zeitraum)
  // Ein KI-Fehler bricht nicht ab: das Blatt "Zusammenfassung" nennt dann den Grund.
  modell.zusammenfassung = await entwurfRapportText(kennzahlenFuerKi(modell))

  const url = process.env.RAPPORT_EXCEL_URL ?? new URL("/api/rapport_excel", request.url).toString()
  let datei: Uint8Array
  try {
    datei = await erzeugeExcel(modell, url)
  } catch (e) {
    console.error("rapport:", e instanceof Error ? e.message : "unbekannter Fehler")
    return NextResponse.json({ fehler: "Rapport konnte nicht erzeugt werden." }, { status: 502 })
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
