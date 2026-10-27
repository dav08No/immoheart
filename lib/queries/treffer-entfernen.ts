// Treffer nie direkt löschen: treffer_entfernen setzt den Grund, den der Archiv-Trigger
// in treffer_archiv übernimmt. Ein blankes DELETE landete dort als "unbekannt".
import "server-only"
import { erstelleServerClient } from "@/lib/supabase/server"

export type TrefferGrund =
  | "passt nicht mehr"
  | "Objekt nicht verfügbar"
  | "Anfrage ruhend"
  | "Anfrage vermittelt"

type Seite = "anfrage_id" | "objekt_id"

export async function entferneTreffer(ids: string[], grund: TrefferGrund): Promise<void> {
  if (ids.length === 0) return
  const supabase = await erstelleServerClient()
  const { error } = await supabase.rpc("treffer_entfernen", { p_ids: ids, p_grund: grund })
  if (error) throw error
}

// Gleicher Filter wie das frühere DELETE: nur status='neu' einer Anfrage bzw. eines
// Objekts. `gegen` begrenzt auf bestimmte Gegenseiten (Rematch), ohne `gegen` alle.
// Gegenseite in JS filtern statt per .in(): lange ID-Listen sprengen sonst die URL.
export async function entferneNeueTreffer(
  seite: Seite,
  id: string,
  grund: TrefferGrund,
  gegen?: string[]
): Promise<void> {
  if (gegen && gegen.length === 0) return
  const supabase = await erstelleServerClient()
  const { data, error } = await supabase
    .from("matches")
    .select("id, anfrage_id, objekt_id")
    .eq(seite, id)
    .eq("status", "neu")
  if (error) throw error
  const gegenSeite: Seite = seite === "anfrage_id" ? "objekt_id" : "anfrage_id"
  const erlaubt = gegen ? new Set(gegen) : null
  const ids = data.filter((m) => !erlaubt || erlaubt.has(m[gegenSeite])).map((m) => m.id)
  await entferneTreffer(ids, grund)
}
