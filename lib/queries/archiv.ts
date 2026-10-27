// Archivieren und Wiederherstellen über die atomaren DB-Funktionen (Migration archiv_f1).
// Server-Client: die Funktionen laufen als security invoker, RLS greift also auch hier.
import "server-only"
import { erstelleServerClient } from "@/lib/supabase/server"
import { pruefeRpcFehler } from "@/lib/queries/rpc-fehler"
import type { Database } from "@/types/database"

type ObjektStatus = Database["public"]["Enums"]["objekt_status_enum"]
type AnfrageStatus = Database["public"]["Enums"]["anfrage_status_enum"]

export async function archiviereObjekt(id: string, grund: string): Promise<void> {
  const supabase = await erstelleServerClient()
  const { error } = await supabase.rpc("objekt_archivieren", { p_id: id, p_grund: grund })
  pruefeRpcFehler(error)
}

export async function archiviereAnfrage(id: string, grund: string): Promise<void> {
  const supabase = await erstelleServerClient()
  const { error } = await supabase.rpc("anfrage_archivieren", { p_id: id, p_grund: grund })
  pruefeRpcFehler(error)
}

// Liefert den Status nach dem Wiederherstellen: nur ein verfügbares Objekt wird neu gematcht.
// Ein Lesefehler danach ist kein Fehlschlag -- das Objekt ist schon zurück, es fehlt nur das Rematching.
export async function stelleObjektWiederHer(id: string): Promise<ObjektStatus | null> {
  const supabase = await erstelleServerClient()
  const { error } = await supabase.rpc("objekt_wiederherstellen", { p_id: id })
  pruefeRpcFehler(error)
  const { data, error: lesefehler } = await supabase.from("objekte").select("status").eq("id", id).single()
  if (!lesefehler) return data.status
  console.error("Status nach dem Wiederherstellen nicht lesbar", id, lesefehler)
  return null
}

// Wie oben: nur eine offene Anfrage wird neu gematcht.
export async function stelleAnfrageWiederHer(id: string): Promise<AnfrageStatus | null> {
  const supabase = await erstelleServerClient()
  const { error } = await supabase.rpc("anfrage_wiederherstellen", { p_id: id })
  pruefeRpcFehler(error)
  const { data, error: lesefehler } = await supabase.from("anfragen").select("status").eq("id", id).single()
  if (!lesefehler) return data.status
  console.error("Status nach dem Wiederherstellen nicht lesbar", id, lesefehler)
  return null
}
