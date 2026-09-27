// Anzeigenamen der Nutzungsarten. Liegt in lib/, damit reine Module (z.B.
// lib/suchauftrag.ts) sie ohne Import aus components/ verwenden können.
import type { Nutzung } from "@/types"

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
