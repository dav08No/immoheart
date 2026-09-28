// Anzeige-Helfer der öffentlichen Objektliste (Server- und Client-Komponenten).
import type { ObjektFilter } from "@/lib/objektsuche"
import { NUTZUNG_OPTIONEN, nutzungLabel } from "@/components/postfach/typen"
import { formatZahl } from "@/lib/format"

export { NUTZUNG_OPTIONEN, nutzungLabel }

export type FilterOptionen = {
  orte: string[]
  eigenschaften: string[]
  // Bereich des Flächen-Sliders; null, wenn es keine Spanne gibt (0 oder 1 Fläche).
  flaeche: { min: number; max: number } | null
}

// formatZahl lebt in lib/format.ts (auch der Admin braucht es); hier nur durchgereicht.
export { formatZahl }

export function eigenschaftLabel(schluessel: string): string {
  const text = schluessel.replaceAll("_", " ")
  return text.charAt(0).toUpperCase() + text.slice(1)
}

export function anzahlAktiverFilter(f: ObjektFilter): number {
  return (
    f.nutzung.length +
    f.orte.length +
    f.eigenschaften.length +
    (f.flaecheMin !== null || f.flaecheMax !== null ? 1 : 0) +
    (f.preisMax !== null ? 1 : 0) +
    (f.verfuegbarBis !== null ? 1 : 0)
  )
}

export function objekteText(anzahl: number): string {
  return anzahl === 1 ? "1 Objekt" : `${formatZahl(anzahl)} Objekte`
}
