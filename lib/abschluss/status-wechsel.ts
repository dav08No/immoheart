import type { Database } from "@/types/database"

type AnfrageStatus = Database["public"]["Enums"]["anfrage_status_enum"]

export type AnfrageStatusFolge = "rematch" | "neu_loeschen" | "nichts"

// Spec §3: nur offene Anfragen werden gematcht. Wer ruhend/vermittelt setzt, räumt die
// noch nicht angebotenen neu-Treffer weg; zurück auf offen rechnet neu. Ein manuelles
// "vermittelt" ändert nie ein Objekt -- deshalb gibt es hier keine Objekt-Folge.
export function anfrageStatusFolge(alt: AnfrageStatus, neu: AnfrageStatus, suchfelderGeaendert: boolean): AnfrageStatusFolge {
  if (neu !== "offen") return alt === neu ? "nichts" : "neu_loeschen"
  return alt !== "offen" || suchfelderGeaendert ? "rematch" : "nichts"
}
