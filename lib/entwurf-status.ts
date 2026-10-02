// Reine Zeit-Entscheidung, losgelöst von der DB-Abfrage (lib/queries/nachrichten.ts) und
// der UI (EntwurfEditor): eine Reservierung (gesendet_am gesetzt, richtung noch "entwurf")
// gilt erst nach RESERVIERUNG_TIMEOUT_MS als festsitzend. Vorher könnte entwurfSenden noch
// mitten im SMTP-Versand stecken -- ein verfrühtes Freigeben würde einen zweiten Versand
// derselben Mail erlauben.
export const RESERVIERUNG_TIMEOUT_MS = 2 * 60 * 1000

export function istReservierungAbgelaufen(gesendetAm: string, jetzt: Date): boolean {
  return jetzt.getTime() - new Date(gesendetAm).getTime() >= RESERVIERUNG_TIMEOUT_MS
}

// Angebots-Entwurf, dessen Treffer gelöscht wurde (matches -> nachrichten ON DELETE SET NULL):
// darf nicht mehr gesendet werden, die Oberfläche markiert ihn als "Treffer entfallen".
export function trefferEntfallen(entwurf: { typ: string; match_id: string | null }): boolean {
  return entwurf.typ === "angebot" && !entwurf.match_id
}
