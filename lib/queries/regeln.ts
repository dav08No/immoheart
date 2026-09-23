import { erstelleServerClient } from "@/lib/supabase/server"

export async function legeRegelAn(code: string, beschreibung: string): Promise<void> {
  const supabase = await erstelleServerClient()
  const { error } = await supabase.from("regeln").insert({ code, beschreibung })
  if (error) throw error
}

export async function naechsterRegelCode(): Promise<string> {
  const supabase = await erstelleServerClient()
  const { count, error } = await supabase.from("regeln").select("*", { count: "exact", head: true })
  if (error) throw error
  return `R-${String((count ?? 0) + 1).padStart(2, "0")}`
}
