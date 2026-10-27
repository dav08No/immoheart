import type { Database } from "@/types/database"

type Enums = Database["public"]["Enums"]

// Fertig aufbereitete Zeilen für die Archiv-Seite: Namen sind schon aufgelöst
// (treffer_archiv hat keine Fremdschlüssel, also kein Embedding), null heisst "nicht gefunden".
export type ArchivTreffer = {
  id: string
  firma: string | null
  objekt: string | null
  status: Enums["match_status_enum"]
  score: number
  angeboten_am: string | null
  archiviert_am: string
  grund: string
}

export type ArchivObjekt = {
  id: string
  titel: string
  ort: string
  nutzung: Enums["nutzung_enum"]
  flaeche: number
  status: Enums["objekt_status_enum"]
  archiviert_am: string
  grund: string | null
  // Was "Endgültig löschen" mitnimmt; vorab gezählt, damit der Dialog nicht nachladen muss.
  trefferAnzahl: number
  // Noch in matches (vermittelt, abgelehnt, …): die Kaskade löscht sie ohne Archiv (Ruling R4).
  abgeschlossenAnzahl: number
  fotoAnzahl: number
}

export type ArchivAnfrage = {
  id: string
  firma: string | null
  eckdaten: string | null
  status: Enums["anfrage_status_enum"]
  archiviert_am: string
  grund: string | null
  trefferAnzahl: number
  abgeschlossenAnzahl: number
}

export type ArchivDaten = { treffer: ArchivTreffer[]; objekte: ArchivObjekt[]; anfragen: ArchivAnfrage[] }
