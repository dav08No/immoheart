// Datenzugriff für öffentliche Seiten: ausschliesslich der normale Server-Client
// (Rolle anon), nie der Admin-Client -- Konstraint N5 verbietet erhöhte Rechte auf
// öffentlichen Seiten, damit nie mehr als objekte_oeffentlich/objekt_fotos sichtbar wird.
import "server-only"
import { erstelleServerClient } from "@/lib/supabase/server"
import type { Database } from "@/types/database"
import type { OeffentlichesObjekt } from "@/lib/objektsuche"
import { erstesJeObjekt, FOTO_BUCKET } from "@/lib/objekt-fotos"

type OeffentlichesObjektRow = Database["public"]["Views"]["objekte_oeffentlich"]["Row"]

type Supabase = Awaited<ReturnType<typeof erstelleServerClient>>

// Portionen halten den id-Filter in der URL kurz; PostgREST liefert je Anfrage
// höchstens 1000 Zeilen, darum zusätzlich seitenweise.
const ID_PORTION = 50
const SEITE = 1000

function fotoUrl(supabase: Supabase, pfad: string): string {
  return supabase.storage.from(FOTO_BUCKET).getPublicUrl(pfad).data.publicUrl
}

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
  const titelbild = foto ? fotoUrl(supabase, foto.pfad) : null

  return zuOeffentlichesObjekt(objekt, titelbild)
}

export async function holeOeffentlicheObjekte(): Promise<OeffentlichesObjekt[]> {
  const supabase = await erstelleServerClient()
  const { data: objekte, error } = await supabase.from("objekte_oeffentlich").select("*")
  if (error) throw error

  const ids = objekte.map((o) => o.id).filter((id): id is string => id !== null)
  const titelbilder = new Map<string, string>()
  for (let i = 0; i < ids.length; i += ID_PORTION) {
    const portion = ids.slice(i, i + ID_PORTION)
    for (let von = 0; ; von += SEITE) {
      const { data, error: fotoFehler } = await supabase
        .from("objekt_fotos")
        .select("objekt_id, pfad")
        .in("objekt_id", portion)
        .order("objekt_id")
        .order("reihenfolge")
        .order("id")
        .range(von, von + SEITE - 1)
      if (fotoFehler) throw fotoFehler
      // Sortiert nach objekt_id: das erste Foto eines Objekts kommt vor seinen übrigen.
      for (const [objektId, foto] of erstesJeObjekt(data)) {
        if (!titelbilder.has(objektId)) titelbilder.set(objektId, fotoUrl(supabase, foto.pfad))
      }
      if (data.length < SEITE) break
    }
  }

  return objekte.map((o) => zuOeffentlichesObjekt(o, titelbilder.get(o.id!) ?? null))
}

export type OeffentlichesFoto = { id: string; url: string }

// Nur mit ids aus objekte_oeffentlich aufrufen: eingeloggte Konten sehen per Policy
// alle Fotos, auch die nicht gelisteter Objekte. Kein created_at -- anon hat nur
// Spaltenrechte auf id, objekt_id, pfad, reihenfolge.
export async function holeOeffentlicheFotos(objektId: string): Promise<OeffentlichesFoto[]> {
  const supabase = await erstelleServerClient()
  const { data, error } = await supabase
    .from("objekt_fotos")
    .select("id, pfad")
    .eq("objekt_id", objektId)
    .order("reihenfolge")
    .order("id")
  if (error) throw error
  return data.map((f) => ({ id: f.id, url: fotoUrl(supabase, f.pfad) }))
}
