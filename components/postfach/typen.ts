import type { Nutzung } from "@/types"

// Minimaler Ausschnitt eines Entwurfs (holeEntwuerfe, page.tsx): reicht, um zu einem
// Eingang den Rückfrage-/Antwort-Entwurf zu finden und zu öffnen.
export type EntwurfVerweis = { id: string; antwort_auf: string | null; an: string; typ: string }

export type AnfrageOption = { id: string; label: string; offen: boolean }

export type AktionAusfuehren = (
  schluessel: string,
  aktion: () => Promise<{ fehler: string | null }>,
  erfolg?: string
) => Promise<boolean>

export const NUTZUNG_OPTIONEN: { wert: Nutzung; label: string }[] = [
  { wert: "buero", label: "Büro" },
  { wert: "gewerbe", label: "Gewerbe" },
  { wert: "produktion", label: "Produktion" },
  { wert: "lager", label: "Lager" },
  { wert: "verkauf", label: "Verkauf" },
  { wert: "bauland", label: "Bauland" },
]

export function nutzungLabel(nutzung: string | null): string | null {
  return NUTZUNG_OPTIONEN.find((o) => o.wert === nutzung)?.label ?? nutzung ?? null
}

export const FELD_LABELS = {
  firma: "Firma",
  flaeche_min: "Fläche ab",
  flaeche_max: "Fläche bis",
  ort: "Ort",
  budget_pro_m2: "Budget CHF/m²",
  bezug: "Bezug",
  branche: "Branche",
  nutzung: "Nutzung",
} as const

export const AUSWAHL_KLASSE = "w-full rounded-lg border border-line-2 bg-surface px-3 py-2 text-sm text-ink disabled:opacity-60"

// Nur Titel + Ort für die Objekt-Auswahl (Mail-Bild als Objektfoto), keine Adresse.
export type ObjektOption = { id: string; label: string }
