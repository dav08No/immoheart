// Was eine Zeilenaktion braucht: die Action wählt der Typ, den Dialogtext die Bezeichnung.
export type ArchivZiel = {
  typ: "treffer" | "objekt" | "anfrage"
  id: string
  bezeichnung: string
  // Nur Objekte/Anfragen: "Mitgelöscht werden: …" im Lösch-Dialog, null = nichts weiter.
  mitgeloescht: string | null
}

export type ZeilenProps = {
  istAdmin: boolean
  gesperrt: boolean
  onWiederherstellen: (ziel: ArchivZiel) => void
  onLoeschen: (ziel: ArchivZiel) => void
}

// Fehlender Name (Lookup ohne Treffer) erscheint einheitlich als Strich.
export const FEHLT = "—"
