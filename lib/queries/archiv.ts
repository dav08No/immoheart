// Archivieren und Wiederherstellen über die atomaren DB-Funktionen (Migration archiv_f1).
// Server-Client: die Funktionen laufen als security invoker, RLS greift also auch hier.
import "server-only"
import { erstelleServerClient } from "@/lib/supabase/server"
import { erstelleAdminClient } from "@/lib/supabase/admin"
import { FOTO_BUCKET } from "@/lib/objekt-fotos"
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

// Endgültiges Löschen: die DB-Funktionen prüfen ist_admin() selbst (zweite Sperre neben der Action).
export async function loescheArchivEintrag(id: string): Promise<void> {
  const supabase = await erstelleServerClient()
  const { error } = await supabase.rpc("archiv_eintrag_loeschen", { p_id: id })
  pruefeRpcFehler(error)
}

// Liefert die Storage-Pfade der Fotos; die Zeilen sind dann schon weg, die Dateien löscht der Aufrufer.
export async function loescheObjektEndgueltig(id: string): Promise<string[]> {
  const supabase = await erstelleServerClient()
  const { data, error } = await supabase.rpc("objekt_endgueltig_loeschen", { p_id: id })
  pruefeRpcFehler(error)
  return data?.[0]?.foto_pfade ?? []
}

export async function loescheAnfrageEndgueltig(id: string): Promise<void> {
  const supabase = await erstelleServerClient()
  const { error } = await supabase.rpc("anfrage_endgueltig_loeschen", { p_id: id })
  pruefeRpcFehler(error)
}

// Wie entferneDatei in fotos.ts über den Admin-Client (der Bucket hat keine Nutzer-Policies).
// false statt Fehler: der Datensatz ist schon gelöscht, liegen bleibt nur verwaister Speicher.
export async function entferneFotoDateien(pfade: string[]): Promise<boolean> {
  if (pfade.length === 0) return true
  try {
    const { error } = await erstelleAdminClient().storage.from(FOTO_BUCKET).remove(pfade)
    if (!error) return true
    console.error("Fotos nach endgültigem Löschen nicht entfernt", pfade, error)
  } catch (fehler) {
    console.error("Fotos nach endgültigem Löschen nicht entfernt", pfade, fehler)
  }
  return false
}
