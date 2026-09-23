import { erstelleServerClient } from "@/lib/supabase/server"
import type { Database } from "@/types/database"

type AnfrageEinfuegen = Database["public"]["Tables"]["anfragen"]["Insert"]
type AnfrageRow = Database["public"]["Tables"]["anfragen"]["Row"]

export async function legeAnfrageAn(anfrage: AnfrageEinfuegen): Promise<AnfrageRow> {
  const supabase = await erstelleServerClient()
  const { data, error } = await supabase.from("anfragen").insert(anfrage).select().single()
  if (error) throw error
  return data
}
