import type { Database } from "@/types/database"
import type { Kriterium } from "@/types"

type AnfrageStatus = Database["public"]["Enums"]["anfrage_status_enum"]

// Antwort von /api/anfragen/[id]/detail -- eine Stelle für Ansicht und Drawer.
export type BesterMatch = { score: number; kriterien: Kriterium[]; objekte: { titel: string } | null } | null

export const ANFRAGE_STATUS_LABEL: Record<AnfrageStatus, string> = {
  offen: "Offen",
  vermittelt: "Vermittelt",
  ruhend: "Ruhend",
}
