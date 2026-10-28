"use client"

import { RotateCcw, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/Button"
import type { ArchivZiel } from "./typen"

type Props = {
  ziel: ArchivZiel
  istAdmin: boolean
  gesperrt: boolean
  // Treffer-Archiveinträge sind nur lesbar; sie lassen sich nur endgültig löschen.
  wiederherstellbar: boolean
  onWiederherstellen: (ziel: ArchivZiel) => void
  onLoeschen: (ziel: ArchivZiel) => void
}

// Knöpfe am Zeilenende. "Endgültig löschen" bekommen nur Admins zu sehen; die echte
// Sperre sitzt in Server Action und DB-Funktion.
export function ArchivZeilenAktionen({ ziel, istAdmin, gesperrt, wiederherstellbar, onWiederherstellen, onLoeschen }: Props) {
  if (!wiederherstellbar && !istAdmin) return null
  return (
    <div className="flex justify-end gap-2">
      {wiederherstellbar && (
        <Button
          disabled={gesperrt}
          onClick={() => onWiederherstellen(ziel)}
          aria-label={`Wiederherstellen: ${ziel.bezeichnung}`}
          icon={<RotateCcw className="size-4" aria-hidden />}
        >
          Wiederherstellen
        </Button>
      )}
      {istAdmin && (
        <Button
          variante="gefaehrlich"
          disabled={gesperrt}
          onClick={() => onLoeschen(ziel)}
          aria-label={`Endgültig löschen: ${ziel.bezeichnung}`}
          icon={<Trash2 className="size-4" aria-hidden />}
        >
          Endgültig löschen
        </Button>
      )}
    </div>
  )
}
