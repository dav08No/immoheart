import { erstelleServerClient } from "@/lib/supabase/server"
import type { Database } from "@/types/database"
import type { Objekt } from "@/types"

type ObjektRow = Database["public"]["Tables"]["objekte"]["Row"]

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
