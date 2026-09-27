// Reine Entscheidungslogik für objektAnfragen (app/actions/objektanfrage.ts): bildet
// Zwischenergebnisse (Zeit-Token-Status, zod-Fehler, Limit-Überschreitung) auf die
// Antwort ab, die das Formular sieht. Kein Supabase hier -- so bleibt die Zuordnung
// ohne DB unit-testbar; die "use server"-Datei selbst darf laut Next.js nur async
// Funktionen exportieren, diese reinen Helfer also nicht enthalten.
import type { ZodError } from "zod"

export type ObjektAnfrageErgebnis = { ok: true } | { ok: false; fehler: string; feldFehler?: Record<string, string> }

// Nur der erste Fehler je Feld -- ein zweiter (z.B. sowohl "zu kurz" als auch
// "falsches Format") würde ohnehin nur den ersten sichtbaren Hinweis ersetzen.
export function feldFehlerAus(fehler: ZodError): Record<string, string> {
  const ergebnis: Record<string, string> = {}
  for (const issue of fehler.issues) {
    const feld = issue.path[0]
    if (typeof feld === "string" && !(feld in ergebnis)) ergebnis[feld] = issue.message
  }
  return ergebnis
}

export function zeitTokenErgebnis(status: "ok" | "zu_schnell" | "ungueltig"): ObjektAnfrageErgebnis | null {
  return status === "ok" ? null : { ok: false, fehler: "Bitte versuchen Sie es in ein paar Sekunden erneut." }
}

export function limitErgebnis(anzahl: number, limit: number): ObjektAnfrageErgebnis | null {
  return anzahl > limit ? { ok: false, fehler: "Zu viele Anfragen. Bitte später erneut versuchen." } : null
}
