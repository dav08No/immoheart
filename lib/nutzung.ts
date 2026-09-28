// Nutzungsarten und ihre Anzeigenamen. Liegt in lib/, damit reine Module (z.B.
// lib/suchauftrag.ts) sie ohne Import aus components/ verwenden können.
import type { Nutzung } from "@/types"

// Einzige Liste der Werte -- als Tupel, damit z.enum(NUTZUNGEN) sie direkt nimmt.
export const NUTZUNGEN = ["buero", "gewerbe", "produktion", "lager", "verkauf", "bauland"] as const satisfies readonly Nutzung[]

// Record statt Liste: ein fehlender oder falscher Anzeigename fällt beim Typcheck auf.
const LABELS: Record<(typeof NUTZUNGEN)[number], string> = {
  buero: "Büro",
  gewerbe: "Gewerbe",
  produktion: "Produktion",
  lager: "Lager",
  verkauf: "Verkauf",
  bauland: "Bauland",
}

export const NUTZUNG_OPTIONEN: { wert: Nutzung; label: string }[] = NUTZUNGEN.map((wert) => ({ wert, label: LABELS[wert] }))

export function nutzungLabel(nutzung: string | null): string | null {
  return NUTZUNG_OPTIONEN.find((o) => o.wert === nutzung)?.label ?? nutzung ?? null
}
