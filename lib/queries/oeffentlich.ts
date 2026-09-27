// Datenzugriff für öffentliche Seiten: ausschliesslich der normale Server-Client
// (Rolle anon), nie der Admin-Client -- Konstraint N5 verbietet erhöhte Rechte auf
// öffentlichen Seiten, damit nie mehr als objekte_oeffentlich/objekt_fotos sichtbar wird.
import { erstelleServerClient } from "@/lib/supabase/server"
import type { Database } from "@/types/database"
import type { OeffentlichesObjekt } from "@/lib/objektsuche"

type OeffentlichesObjektRow = Database["public"]["Views"]["objekte_oeffentlich"]["Row"]

const FOTO_BUCKET = "objekt-fotos"

// Die generierten View-Typen erlauben null in jeder Spalte (Postgres kennt bei Views
// keine NOT-NULL-Garantie), tatsächlich sind alle Basisspalten der Tabelle objekte
// ausser preis_pro_m2/beschreibung NOT NULL -- eine gefundene Zeile hat sie also immer.
function zuOeffentlichesObjekt(row: OeffentlichesObjektRow, titelbild: string | null): OeffentlichesObjekt {
  return {
    id: row.id!,
    titel: row.titel!,
    ort: row.ort!,
    flaeche: row.flaeche!,
    preis_pro_m2: row.preis_pro_m2,
    nutzung: row.nutzung!,
    eigenschaften: (row.eigenschaften as Record<string, unknown> | null) ?? {},
    verfuegbar_ab: row.verfuegbar_ab!,
    status: row.status as "verfuegbar" | "reserviert",
    created_at: row.created_at!,
    beschreibung: row.beschreibung,
    titelbild,
  }
}

export async function holeOeffentlichesObjekt(id: string): Promise<OeffentlichesObjekt | null> {
  const supabase = await erstelleServerClient()
  const { data: objekt, error } = await supabase.from("objekte_oeffentlich").select("*").eq("id", id).maybeSingle()
  if (error) throw error
  if (!objekt) return null

  // Erstes Foto nach reihenfolge als Titelbild -- Task 6 zeigt eine ganze Galerie,
  // hier reicht das einzelne Bild für die Objektanfrage-Bestätigung/Vorschau.
  const { data: foto, error: fotoFehler } = await supabase
    .from("objekt_fotos")
    .select("pfad")
    .eq("objekt_id", id)
    .order("reihenfolge", { ascending: true })
    .limit(1)
    .maybeSingle()
  if (fotoFehler) throw fotoFehler
  const titelbild = foto ? supabase.storage.from(FOTO_BUCKET).getPublicUrl(foto.pfad).data.publicUrl : null

  return zuOeffentlichesObjekt(objekt, titelbild)
}
