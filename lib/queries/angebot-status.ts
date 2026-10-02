// Status von Treffer und Objekt zu einem Angebots- oder Absage-Entwurf, für die Sendesperre (entwurfGesperrt).
// Eigene Datei, weil versand.ts und matches.ts am Zeilenlimit stehen.
import { erstelleServerClient } from "@/lib/supabase/server"
import type { Database } from "@/types/database"

type Enums = Database["public"]["Enums"]
export type AngebotsStatus = {
  matchStatus: Enums["match_status_enum"] | null
  objektStatus: Enums["objekt_status_enum"] | null
}

// Fehlender Treffer liefert null/null -- entwurfGesperrt sperrt dann ohnehin.
export async function holeAngebotsStatus(matchId: string): Promise<AngebotsStatus> {
  const supabase = await erstelleServerClient()
  const { data, error } = await supabase.from("matches").select("status, objekte(status)").eq("id", matchId).maybeSingle()
  if (error) throw error
  return { matchStatus: data?.status ?? null, objektStatus: data?.objekte?.status ?? null }
}
