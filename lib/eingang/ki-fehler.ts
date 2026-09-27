import { istVoruebergehend } from "@/lib/ki/gemini"

const MAX_FEHLER_LAENGE = 300

function meldung(fehler: unknown): string | null {
  if (typeof fehler !== "object" || fehler === null) return null
  const text = (fehler as Record<string, unknown>).message
  return typeof text === "string" && text.length > 0 ? text : null
}

// Der Text landet in ki_fehler und damit im Postfach: kurz halten und nie
// URL-Parameter mit Schlüsseln durchreichen, die manche Client-Fehler zitieren.
export function kiFehlerText(fehler: unknown): string {
  if (istVoruebergehend(fehler)) return "KI vorübergehend überlastet, bitte später erneut verarbeiten."
  if (fehler instanceof SyntaxError) return "Unerwartete Antwort der KI."
  const text = meldung(fehler)
  if (!text) return "Verarbeitung fehlgeschlagen."
  const bereinigt = text.replace(/key=[^&\s]+/gi, "key=***")
  return `Verarbeitung fehlgeschlagen: ${bereinigt}`.slice(0, MAX_FEHLER_LAENGE)
}
