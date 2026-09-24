import { erstelleServerClient } from "@/lib/supabase/server"
import type { Database } from "@/types/database"

export type RegelRow = Database["public"]["Tables"]["regeln"]["Row"]

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

export async function holeRegeln(): Promise<RegelRow[]> {
  const supabase = await erstelleServerClient()
  const { data, error } = await supabase.from("regeln").select("*").order("created_at", { ascending: false })
  if (error) throw error
  return data
}

// Gleiches Muster wie aktualisiereAnfrage/aktualisiereObjekt/aktualisiereMatchStatus
// (M6/M7/M8 Whole-Branch-Review): "vermittler aendert regeln" (20260922195659_rls.sql)
// schränkt das UPDATE per USING auf current_rolle() in ('admin', 'vermittler') ein,
// während "eingeloggt liest regeln" jede eingeloggte Rolle lesen lässt. Ein
// RLS-gefiltertes UPDATE ohne betroffene Zeile ist aus Client-Sicht ein Erfolg ohne
// Fehler -- ohne `.select("id").maybeSingle()` plus explizitem Null-Check würde ein
// leser hier scheinbar erfolgreich umschalten, obwohl nichts persistiert wurde.
export async function setzeRegelAktiv(id: string, aktiv: boolean): Promise<void> {
  const supabase = await erstelleServerClient()
  const { data, error } = await supabase.from("regeln").update({ aktiv }).eq("id", id).select("id").maybeSingle()
  if (error) throw error
  if (!data) throw new Error("Regel konnte nicht aktualisiert werden")
}
