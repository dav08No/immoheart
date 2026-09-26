import { erstelleServerClient } from "@/lib/supabase/server"
import type { Database } from "@/types/database"
import type { Anfrage } from "@/types"

type AnfrageEinfuegen = Database["public"]["Tables"]["anfragen"]["Insert"]
type AnfrageRow = Database["public"]["Tables"]["anfragen"]["Row"]
export type AnfrageMitFirma = AnfrageRow & { firma: { name: string; website: string | null } | null }

export async function legeAnfrageAn(anfrage: AnfrageEinfuegen): Promise<AnfrageRow> {
  const supabase = await erstelleServerClient()
  const { data, error } = await supabase.from("anfragen").insert(anfrage).select().single()
  if (error) throw error
  return data
}

// Firmen separat laden und im Code verknüpfen: bei null firma_id bleibt firma null.
export async function holeAnfragen(): Promise<AnfrageMitFirma[]> {
  const supabase = await erstelleServerClient()
  const [{ data: anfragenData, error: anfragenError }, { data: firmenData, error: firmenError }] = await Promise.all([
    supabase.from("anfragen").select("*").order("letzter_kontakt", { ascending: true }),
    supabase.from("firmen").select("id, name, website"),
  ])
  if (anfragenError) throw anfragenError
  if (firmenError) throw firmenError

  const firmenNachId = new Map(firmenData.map((f) => [f.id, f]))
  return anfragenData.map((a) => ({ ...a, firma: a.firma_id ? (firmenNachId.get(a.firma_id) ?? null) : null }))
}

export async function holeAnfrage(id: string): Promise<AnfrageRow | null> {
  const supabase = await erstelleServerClient()
  const { data, error } = await supabase.from("anfragen").select("*").eq("id", id).maybeSingle()
  if (error) throw error
  return data
}

// UPDATE ohne betroffene Zeile ist für PostgREST kein Fehler -- deshalb die id prüfen.
export async function aktualisiereAnfrage(id: string, aenderung: Partial<AnfrageEinfuegen>): Promise<void> {
  const supabase = await erstelleServerClient()
  const { data, error } = await supabase.from("anfragen").update(aenderung).eq("id", id).select("id").maybeSingle()
  if (error) throw error
  if (!data) throw new Error("Anfrage konnte nicht aktualisiert werden")
}

export async function holeOffeneAnfragen(): Promise<AnfrageRow[]> {
  const supabase = await erstelleServerClient()
  const { data, error } = await supabase.from("anfragen").select("*").eq("status", "offen")
  if (error) throw error
  return data
}

export async function holeOffenePulsWerte(): Promise<Date[]> {
  const supabase = await erstelleServerClient()
  const { data, error } = await supabase.from("anfragen").select("letzter_kontakt").eq("status", "offen")
  if (error) throw error
  return data.map((row) => new Date(row.letzter_kontakt))
}

export async function holeFirma(firmaId: string): Promise<{ name: string; kontakt_email: string | null } | null> {
  const supabase = await erstelleServerClient()
  const { data, error } = await supabase.from("firmen").select("name, kontakt_email").eq("id", firmaId).maybeSingle()
  if (error) throw error
  return data
}

export function zuAnfrageDomain(row: AnfrageRow): Anfrage {
  return {
    id: row.id,
    flaecheMin: row.flaeche_min,
    flaecheMax: row.flaeche_max,
    ort: row.ort,
    budgetProM2: row.budget_pro_m2,
    bezug: row.bezug,
    nutzung: row.nutzung,
    anforderungen: row.anforderungen as Record<string, boolean | number | string>,
    letzterKontakt: new Date(row.letzter_kontakt),
  }
}

export type VerlaufEintrag = { zeitpunkt: string; text: string }

// Kein eigenes Ereignis-Log im Schema (README nennt "Verlauf" im Drawer, ohne
// eine Tabelle dafür vorzusehen) -- abgeleitet aus den Zeitstempeln, die
// ohnehin bereits existieren: Anlage, jeder erzeugte Match, jede gesendete Mail.
export async function holeVerlaufFuerAnfrage(anfrageId: string): Promise<VerlaufEintrag[]> {
  const supabase = await erstelleServerClient()
  const [
    { data: anfrageData, error: anfrageError },
    { data: matchesData, error: matchesError },
    { data: nachrichtenData, error: nachrichtenError },
  ] = await Promise.all([
    supabase.from("anfragen").select("created_at").eq("id", anfrageId).maybeSingle(),
    supabase.from("matches").select("created_at, objekte(titel)").eq("anfrage_id", anfrageId),
    supabase.from("nachrichten").select("typ, gesendet_am").eq("anfrage_id", anfrageId).not("gesendet_am", "is", null),
  ])
  if (anfrageError) throw anfrageError
  if (matchesError) throw matchesError
  if (nachrichtenError) throw nachrichtenError
  if (!anfrageData?.created_at) throw new Error("Anfrage nicht gefunden")

  const TYP_TEXT: Record<string, string> = {
    angebot: "Angebot gesendet", rueckfrage: "Rückfrage gesendet", nachfass: "Nachfass gesendet", anfrage: "Gesendet",
  }

  const eintraege: VerlaufEintrag[] = [{ zeitpunkt: anfrageData.created_at, text: "Angelegt" }]
  for (const m of matchesData) {
    eintraege.push({ zeitpunkt: m.created_at, text: `Neu gematcht mit ${m.objekte?.titel ?? "Objekt"}` })
  }
  for (const n of nachrichtenData) {
    eintraege.push({ zeitpunkt: n.gesendet_am as string, text: TYP_TEXT[n.typ] ?? "Gesendet" })
  }

  return eintraege.sort((a, b) => b.zeitpunkt.localeCompare(a.zeitpunkt))
}
