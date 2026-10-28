// Anzeigenamen für den Rapport. Record über die DB-Enums: ein neuer Enum-Wert fällt beim
// Typcheck auf, statt im Excel als Rohwert zu erscheinen.
import type { Database } from "@/types/database"

type Enums = Database["public"]["Enums"]

export const OBJEKT_STATUS_LABEL: Record<Enums["objekt_status_enum"], string> = {
  verfuegbar: "Verfügbar",
  reserviert: "Reserviert",
  vermietet: "Vermietet",
}

export const ANFRAGE_STATUS_LABEL: Record<Enums["anfrage_status_enum"], string> = {
  offen: "Offen",
  vermittelt: "Vermittelt",
  ruhend: "Ruhend",
}

const QUELLE_LABEL: Record<string, string> = { mail: "Mail", website: "Website", manuell: "Manuell" }

export function quelleLabel(quelle: string): string {
  return QUELLE_LABEL[quelle] ?? quelle
}

// Ergebnis eines gesendeten Angebots (Spec: angeboten, reserviert, vermittelt, abgelehnt,
// erledigt, archiviert). "neu" kommt nach einem Versand nur durch Rematching vor.
export const ANGEBOT_ERGEBNIS: Record<Enums["match_status_enum"], string> = {
  neu: "angeboten",
  gesendet: "angeboten",
  reserviert: "reserviert",
  vermittelt: "vermittelt",
  abgelehnt: "abgelehnt",
  erledigt: "erledigt",
  verworfen: "verworfen",
}
