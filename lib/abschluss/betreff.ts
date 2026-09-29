// Aus app/actions/matches.ts ausgelagert, damit Angebot, Nachfass, Absage und Bestätigung
// denselben Verlauf fortsetzen, ohne die Logik zu duplizieren.
import { holeGesendeteIdsFuerAnfrage, holeLetztenGesendetenBetreff } from "@/lib/queries/versand"
import { antwortBetreff } from "@/lib/mail/verlauf"

// Gibt es für die Anfrage bereits gesendete Mails, hängt der neue Entwurf mit
// "Re:" an deren letzten Betreff an, statt den von der KI frei erfundenen
// Betreff zu verwenden -- der Verlauf im Mailprogramm der Firma soll an ihre
// eigene Konversation anschliessen.
export async function betreffFuerAnfrage(anfrageId: string, kiBetreff: string): Promise<string> {
  const bisherige = await holeGesendeteIdsFuerAnfrage(anfrageId)
  if (bisherige.length === 0) return kiBetreff
  const letzterBetreff = await holeLetztenGesendetenBetreff(anfrageId)
  return letzterBetreff ? antwortBetreff(letzterBetreff) : kiBetreff
}
