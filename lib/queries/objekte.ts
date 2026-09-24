import { erstelleServerClient } from "@/lib/supabase/server"
import type { Database } from "@/types/database"
import type { Objekt } from "@/types"

type ObjektRow = Database["public"]["Tables"]["objekte"]["Row"]
type ObjektEinfuegen = Database["public"]["Tables"]["objekte"]["Insert"]

// Minimal für M6 -- nur was berechneUndSpeichereMatchesFuerAnfrage (matches.ts)
// braucht, um gegen alle aktuell verfügbaren Objekte zu matchen. Vollständiges
// CRUD/Listing für Objekte folgt in M7.
export async function holeVerfuegbareObjekte(): Promise<ObjektRow[]> {
  const supabase = await erstelleServerClient()
  const { data, error } = await supabase.from("objekte").select("*").eq("status", "verfuegbar")
  if (error) throw error
  return data
}

export function zuObjektDomain(row: ObjektRow): Objekt {
  return {
    id: row.id,
    titel: row.titel,
    ort: row.ort,
    flaeche: row.flaeche,
    preisProM2: row.preis_pro_m2,
    nutzung: row.nutzung,
    eigenschaften: row.eigenschaften as Record<string, boolean | number | string>,
    verfuegbarAb: new Date(row.verfuegbar_ab),
  }
}

export async function holeObjekte(): Promise<ObjektRow[]> {
  const supabase = await erstelleServerClient()
  const { data, error } = await supabase.from("objekte").select("*").order("created_at", { ascending: false })
  if (error) throw error
  return data
}

export async function holeObjekt(id: string): Promise<ObjektRow | null> {
  const supabase = await erstelleServerClient()
  const { data, error } = await supabase.from("objekte").select("*").eq("id", id).maybeSingle()
  if (error) throw error
  return data
}

export async function legeObjektAn(objekt: ObjektEinfuegen): Promise<ObjektRow> {
  const supabase = await erstelleServerClient()
  const { data, error } = await supabase.from("objekte").insert(objekt).select().single()
  if (error) throw error
  return data
}

// Gleiches Muster wie aktualisiereAnfrage (lib/queries/anfragen.ts, M6
// Whole-Branch-Review): "vermittler aendert objekte" (20260922195659_rls.sql)
// schränkt das UPDATE per USING auf current_rolle() in ('admin','vermittler')
// ein. Trifft ein leser mit dieser Funktion keine Zeile, meldet Postgres/
// PostgREST dafür KEINEN Fehler -- ein RLS-gefiltertes UPDATE ohne
// betroffene Zeilen ist aus Client-Sicht ein Erfolg. Ohne `.select("id").
// maybeSingle()` plus explizitem Null-Check würde ein leser, der
// aktualisiereObjekt erreicht, scheinbar erfolgreich speichern, obwohl
// nichts persistiert wurde.
export async function aktualisiereObjekt(id: string, aenderung: Partial<ObjektEinfuegen>): Promise<void> {
  const supabase = await erstelleServerClient()
  const { data, error } = await supabase.from("objekte").update(aenderung).eq("id", id).select("id").maybeSingle()
  if (error) throw error
  if (!data) throw new Error("Objekt konnte nicht aktualisiert werden")
}

export async function zaehleMatchesFuerObjekt(objektId: string): Promise<number> {
  const supabase = await erstelleServerClient()
  const { count, error } = await supabase
    .from("matches")
    .select("*", { count: "exact", head: true })
    .eq("objekt_id", objektId)
  if (error) throw error
  return count ?? 0
}
