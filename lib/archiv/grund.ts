// Archiv-Grund: Freitext, optional. Pur, damit Dialog und Server Action dieselbe Grenze nutzen.
import { NutzerFehler } from "@/lib/nutzer-fehler"

export const GRUND_MAX = 200

// Leer bleibt "" -- die DB-Funktion macht daraus per nullif(trim(...)) ein null.
export function pruefeGrund(grund: unknown): string {
  if (grund === undefined || grund === null) return ""
  if (typeof grund !== "string") throw new NutzerFehler("Ungültiger Grund.")
  const getrimmt = grund.trim()
  if (getrimmt.length > GRUND_MAX) throw new NutzerFehler(`Der Grund darf höchstens ${GRUND_MAX} Zeichen haben.`)
  return getrimmt
}
