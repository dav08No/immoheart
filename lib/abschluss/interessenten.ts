import type { TrefferStatus } from "./uebergaenge"
import type { Database } from "@/types/database"

type AnfrageStatus = Database["public"]["Enums"]["anfrage_status_enum"]

// Ein Treffer des Objekts ab "Angeboten" für den Abschnitt "Interessenten" im Objekt-Panel.
export type Interessent = {
  id: string
  status: TrefferStatus
  angeboten_am: string | null
  firma: string
  // R9/R10: die Aktionen hängen auch vom Status der jeweiligen Anfrage ab.
  anfrageStatus: AnfrageStatus
  // Weitere angebotene (gesendet) Treffer desselben Objekts -- für den Folgen-Dialog.
  andereAngebote: number
}

export type InteressentRoh = {
  id: string
  status: TrefferStatus
  angeboten_am: string | null
  anfrage: { status: AnfrageStatus; firma: string | null } | null
}

const NICHT_ANGEBOTEN: readonly TrefferStatus[] = ["neu", "verworfen"]

// Rein, damit Filter- und Zählregel ohne DB testbar sind. Ohne Anfrage-Zeile (RLS/Löschung)
// gilt "offen", damit die Zeile nicht still verschwindet.
export function baueInteressenten(roh: InteressentRoh[]): Interessent[] {
  const angeboten = roh.filter((t) => !NICHT_ANGEBOTEN.includes(t.status))
  return angeboten.map((t) => ({
    id: t.id,
    status: t.status,
    angeboten_am: t.angeboten_am,
    firma: t.anfrage?.firma ?? "Unbekannte Firma",
    anfrageStatus: t.anfrage?.status ?? "offen",
    andereAngebote: angeboten.filter((o) => o.id !== t.id && o.status === "gesendet").length,
  }))
}

// "Nicht mehr verfügbar" schliesst alle angebotenen und reservierten Treffer; je Treffer
// entsteht ein Absage-Entwurf (je Treffer ein eigener Platzhalter, Ruling R7).
export function absageEmpfaenger(interessenten: Interessent[]): number {
  return interessenten.filter((i) => i.status === "gesendet" || i.status === "reserviert").length
}
