// Daten für die Abschluss-Entwürfe: Kontext laden, Platzhalter anlegen und füllen (Ruling R7).
import "server-only"
import { erstelleServerClient } from "@/lib/supabase/server"
import { ABSCHLUSS_TYPEN } from "@/lib/abschluss/entwuerfe-plan"
import type { AnfrageEckdaten } from "@/lib/eingang/zuordnung"
import type { Database, Json } from "@/types/database"
import type { NachrichtRow } from "@/lib/queries/nachrichten"

type NachrichtEinfuegen = Database["public"]["Tables"]["nachrichten"]["Insert"]

export type TrefferKontext = {
  id: string
  anfrage_id: string
  firma: string | null
  firmaEmail: string | null
  anfrage: AnfrageEckdaten
}

export type AbschlussKontext = {
  objekt: { id: string; titel: string; eigentuemer_email: string | null }
  treffer: Map<string, TrefferKontext>
}

export async function holeAbschlussKontext(objektId: string, matchIds: string[]): Promise<AbschlussKontext> {
  const supabase = await erstelleServerClient()
  const { data: objekt, error } = await supabase
    .from("objekte")
    .select("id, titel, eigentuemer_email")
    .eq("id", objektId)
    .single()
  if (error) throw error

  const treffer = new Map<string, TrefferKontext>()
  if (matchIds.length === 0) return { objekt, treffer }

  const { data, error: fehler } = await supabase
    .from("matches")
    .select("id, anfrage_id, anfragen(nutzung, flaeche_min, flaeche_max, ort, budget_pro_m2, bezug, firmen(name, kontakt_email))")
    .in("id", matchIds)
  if (fehler) throw fehler
  for (const m of data) {
    const a = m.anfragen
    treffer.set(m.id, {
      id: m.id,
      anfrage_id: m.anfrage_id,
      firma: a?.firmen?.name ?? null,
      firmaEmail: a?.firmen?.kontakt_email ?? null,
      anfrage: {
        nutzung: a?.nutzung ?? null,
        flaeche_min: a?.flaeche_min ?? null,
        flaeche_max: a?.flaeche_max ?? null,
        ort: a?.ort ?? null,
        budget_pro_m2: a?.budget_pro_m2 ?? null,
        bezug: a?.bezug ?? null,
      },
    })
  }
  return { objekt, treffer }
}

export async function legePlatzhalterAn(zeilen: NachrichtEinfuegen[]): Promise<NachrichtRow[]> {
  if (zeilen.length === 0) return []
  const supabase = await erstelleServerClient()
  const { data, error } = await supabase.from("nachrichten").insert(zeilen).select()
  if (error) throw error
  return data
}

// Grobe Vorauswahl in der DB; die genaue Regel steht rein und getestet in zuFuellendePlatzhalter.
export async function holePlatzhalterKandidaten(objektId: string): Promise<NachrichtRow[]> {
  const supabase = await erstelleServerClient()
  const { data, error } = await supabase
    .from("nachrichten")
    .select("*")
    .eq("objekt_id", objektId)
    .eq("richtung", "entwurf")
    .in("typ", [...ABSCHLUSS_TYPEN])
    .is("geloescht_am", null)
    .is("gesendet_am", null)
    .order("created_at", { ascending: true })
  if (error) throw error
  return data
}

// Bedingtes UPDATE: nur ein noch leerer, offener Platzhalter wird gefüllt -- ein paralleles
// Nachholen oder ein inzwischen selbst geschriebener Text bleibt so unangetastet.
export async function fuellePlatzhalter(id: string, felder: { betreff: string; body: string; erkannte_felder: Json }): Promise<void> {
  const supabase = await erstelleServerClient()
  const { error } = await supabase
    .from("nachrichten")
    .update(felder)
    .eq("id", id)
    .eq("richtung", "entwurf")
    .eq("body", "")
    .is("gesendet_am", null)
    .is("geloescht_am", null)
  if (error) throw error
}
