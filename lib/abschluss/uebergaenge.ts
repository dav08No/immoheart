// Reine Übergangsregeln für Treffer (matches.status), gespiegelt zu den DB-Funktionen
// (treffer_reservieren, treffer_vermitteln, reservierung_aufheben, treffer_ablehnen), damit
// die Oberfläche Aktionen ohne Server-Rundreise ein-/ausblenden kann. TrefferStatus wird hier
// von Hand geführt (nicht aus types/database.ts), solange Migration A noch nicht angewendet
// und die DB nicht neu generiert ist -- danach zieht Task 7 die Werte gegen den Enum nach.
export type TrefferStatus =
  | "neu"
  | "gesendet"
  | "verworfen"
  | "reserviert"
  | "vermittelt"
  | "abgelehnt"
  | "erledigt"

// Ebenfalls von Hand: objekt_status_enum ändert sich in Migration A nicht, aber die
// Datei soll unabhängig von generierten Typen kompilieren.
export type ObjektStatus = "verfuegbar" | "reserviert" | "vermietet"

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
export function erlaubteAktionen(treffer: TrefferStatus, objekt: ObjektStatus): TrefferAktion[] {
  if (treffer === "gesendet" && objekt === "verfuegbar") return ["reservieren", "ablehnen"]
  if (treffer === "gesendet" && objekt === "reserviert") return ["ablehnen"]
  if (treffer === "reserviert") return ["vermitteln", "aufheben"]
  return []
}
