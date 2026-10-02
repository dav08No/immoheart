import type { Database } from "@/types/database"

// Reine Übergangsregeln für Treffer (matches.status), gespiegelt zu den DB-Funktionen
// (treffer_reservieren, treffer_vermitteln, reservierung_aufheben, treffer_ablehnen), damit
// die Oberfläche Aktionen ohne Server-Rundreise ein-/ausblenden kann. Beide Status-Typen
// kommen direkt aus dem generierten Enum, damit sie nie von der DB abweichen.
export type TrefferStatus = Database["public"]["Enums"]["match_status_enum"]
export type ObjektStatus = Database["public"]["Enums"]["objekt_status_enum"]

export const TREFFER_STATUS_LABEL: Record<TrefferStatus, string> = {
  neu: "Neu",
  gesendet: "Angeboten",
  verworfen: "Verworfen",
  reserviert: "Reserviert",
  vermittelt: "Vermittelt",
  abgelehnt: "Abgelehnt",
  erledigt: "Erledigt",
}

export type TrefferAktion = "reservieren" | "vermitteln" | "aufheben" | "ablehnen"

// Welche Aktionen im aktuellen Zustand erlaubt sind. gesendet+reserviert heisst: das Objekt
// ist für eine andere Firma reserviert -- dieser Treffer kann dann nur noch abgelehnt werden.
// reserviert setzt wie die SQL-Funktionen ein reserviertes Objekt voraus, sonst keine Aktion.
export function erlaubteAktionen(treffer: TrefferStatus, objekt: ObjektStatus): TrefferAktion[] {
  if (treffer === "gesendet" && objekt === "verfuegbar") return ["reservieren", "ablehnen"]
  if (treffer === "gesendet" && objekt === "reserviert") return ["ablehnen"]
  if (treffer === "reserviert" && objekt === "reserviert") return ["vermitteln", "aufheben"]
  return []
}
