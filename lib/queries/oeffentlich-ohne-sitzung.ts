// sitemap.ts läuft ohne eingehenden Request (kein Zugriff auf Cookies möglich) --
// erstelleServerClient() würde deshalb crashen. Hier ein eigener, cookie-loser
// anon-Client statt des üblichen Server-Clients; er liest ausschliesslich die
// öffentliche View objekte_oeffentlich, nie den Admin-Client (Ruling R2).
import "server-only"
import { createClient } from "@supabase/supabase-js"
import type { Database } from "@/types/database"

export type OeffentlicheObjektId = { id: string; created_at: string }

export async function holeOeffentlicheObjektIds(): Promise<OeffentlicheObjektId[]> {
  const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  const { data, error } = await supabase.from("objekte_oeffentlich").select("id, created_at")
  if (error) throw error

  // Die generierten View-Typen erlauben null in jeder Spalte (Postgres kennt bei
  // Views keine NOT-NULL-Garantie); tatsächlich sind id/created_at nie leer.
  return data.filter((o): o is OeffentlicheObjektId => o.id !== null && o.created_at !== null)
}
