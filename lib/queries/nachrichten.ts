import { erstelleServerClient } from "@/lib/supabase/server"
import type { Database } from "@/types/database"

export type NachrichtRow = Database["public"]["Tables"]["nachrichten"]["Row"]
type NachrichtEinfuegen = Database["public"]["Tables"]["nachrichten"]["Insert"]

export async function holeNachrichten(): Promise<NachrichtRow[]> {
  const supabase = await erstelleServerClient()
  const { data, error } = await supabase.from("nachrichten").select("*").order("created_at", { ascending: false })
  if (error) throw error
  return data
}

export async function holeNachricht(id: string): Promise<NachrichtRow | null> {
  const supabase = await erstelleServerClient()
  const { data, error } = await supabase.from("nachrichten").select("*").eq("id", id).maybeSingle()
  if (error) throw error
  return data
}

export async function legeNachrichtAn(nachricht: NachrichtEinfuegen): Promise<NachrichtRow> {
  const supabase = await erstelleServerClient()
  const { data, error } = await supabase.from("nachrichten").insert(nachricht).select().single()
  if (error) throw error
  return data
}

export async function aktualisiereNachricht(id: string, aenderung: Partial<NachrichtRow>): Promise<void> {
  const supabase = await erstelleServerClient()
  const { error } = await supabase.from("nachrichten").update(aenderung).eq("id", id)
  if (error) throw error
}

export async function loescheNachricht(id: string): Promise<void> {
  const supabase = await erstelleServerClient()
  const { error } = await supabase.from("nachrichten").delete().eq("id", id)
  if (error) throw error
}

// Atomarer Lösch-und-Rückgabe-Aufruf (statt erst holen, dann getrennt löschen):
// Postgres serialisiert konkurrierende DELETEs auf dieselbe Zeile über
// Row-Level-Locking, sodass von zwei überlappenden Aufrufen für dieselbe id
// (z.B. ein Doppelklick, der die clientseitige Sperre in PostfachAnsicht/
// Task 44 umgeht) nur EINER die Zeile zurückbekommt -- der andere erhält
// garantiert `null` statt derselben, in Wahrheit schon gelöschten Zeile.
// Für `alsAnfrageSpeichern` (Task 39/44), wo genau dieses doppelte Lesen einer
// noch-nicht-gelöschten Zeile sonst zu zwei doppelten Anfragen führen konnte.
export async function loescheUndGibNachrichtZurueck(id: string): Promise<NachrichtRow | null> {
  const supabase = await erstelleServerClient()
  const { data, error } = await supabase.from("nachrichten").delete().eq("id", id).select().maybeSingle()
  if (error) throw error
  return data
}

// Zaehlt nur "eingang" und "entwurf" -- Nachrichten, die noch eine Aktion
// brauchen (ansehen/als Anfrage speichern bzw. Entwurf pruefen/senden). Bereits
// "gesendet" Nachrichten bleiben dauerhaft in der Tabelle (keine der bestehenden
// Aktionen loescht sie) und wuerden die Zahl sonst unbegrenzt aufblaehen, obwohl
// sie fuer den Sidebar-Badge (Task 45, "was braucht Aufmerksamkeit") bereits
// erledigt sind. Einziger Aufrufer aktuell ist genau dieser Badge.
export async function zaehleNachrichten(): Promise<number> {
  const supabase = await erstelleServerClient()
  const { count, error } = await supabase
    .from("nachrichten")
    .select("*", { count: "exact", head: true })
    .in("richtung", ["eingang", "entwurf"])
  if (error) throw error
  return count ?? 0
}
