import { erstelleServerClient } from "@/lib/supabase/server"
import type { Database } from "@/types/database"

type FirmaRow = Database["public"]["Tables"]["firmen"]["Row"]
type FirmaEinfuegen = Database["public"]["Tables"]["firmen"]["Insert"]

// kontakt_email wird ausschliesslich aus der bereits kleingeschriebenen Absenderadresse
// (nachrichten.von) befüllt -- ein eq auf die ebenfalls kleingeschriebene Suchadresse
// reicht deshalb für einen case-insensitiven Treffer, ohne ilike-Escaping von %/_.
export async function holeFirmaPerEmail(email: string): Promise<FirmaRow | null> {
  const supabase = await erstelleServerClient()
  const { data, error } = await supabase
    .from("firmen")
    .select("*")
    .eq("kontakt_email", email.toLowerCase())
    .maybeSingle()
  if (error) throw error
  return data
}

export async function legeFirmaAn(firma: FirmaEinfuegen): Promise<FirmaRow> {
  const supabase = await erstelleServerClient()
  const { data, error } = await supabase.from("firmen").insert(firma).select().single()
  if (error) throw error
  return data
}
