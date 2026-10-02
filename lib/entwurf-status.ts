import type { Database } from "@/types/database"

// Reine Zeit-Entscheidung, losgelöst von der DB-Abfrage (lib/queries/nachrichten.ts) und
// der UI (EntwurfEditor): eine Reservierung (gesendet_am gesetzt, richtung noch "entwurf")
// gilt erst nach RESERVIERUNG_TIMEOUT_MS als festsitzend. Vorher könnte entwurfSenden noch
// mitten im SMTP-Versand stecken -- ein verfrühtes Freigeben würde einen zweiten Versand
// derselben Mail erlauben.
export const RESERVIERUNG_TIMEOUT_MS = 2 * 60 * 1000

export function istReservierungAbgelaufen(gesendetAm: string, jetzt: Date): boolean {
  return jetzt.getTime() - new Date(gesendetAm).getTime() >= RESERVIERUNG_TIMEOUT_MS
}

type Enums = Database["public"]["Enums"]

export const ANGEBOT_GESPERRT =
  "Das Objekt dieses Angebots ist nicht mehr verfügbar oder der Treffer ist abgeschlossen – Entwurf löschen."

// Ein Angebot ist nur sendbar, solange sein Treffer noch offen (neu/gesendet) und das Objekt
// verfügbar ist. Sonst böte es ein vergebenes Objekt an -- etwa der liegengebliebene Entwurf
// an eine andere Firma nach "Vertrag unterschrieben". match_id null heisst: Treffer gelöscht
// (matches -> nachrichten ON DELETE SET NULL).
export function angebotGesperrt(
  entwurf: { typ: string; match_id: string | null },
  matchStatus: Enums["match_status_enum"] | null,
  objektStatus: Enums["objekt_status_enum"] | null
): boolean {
  if (entwurf.typ !== "angebot") return false
  if (!entwurf.match_id) return true
  return !(matchStatus === "neu" || matchStatus === "gesendet") || objektStatus !== "verfuegbar"
}
