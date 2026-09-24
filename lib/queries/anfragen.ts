import { erstelleServerClient } from "@/lib/supabase/server"
import type { Database } from "@/types/database"
import type { Anfrage } from "@/types"

type AnfrageEinfuegen = Database["public"]["Tables"]["anfragen"]["Insert"]
type AnfrageRow = Database["public"]["Tables"]["anfragen"]["Row"]
type AnfrageSichtbarRow = Database["public"]["Views"]["anfragen_sichtbar"]["Row"]
export type AnfrageMitFirma = AnfrageSichtbarRow & { firma: { name: string; website: string | null } | null }

export async function legeAnfrageAn(anfrage: AnfrageEinfuegen): Promise<AnfrageRow> {
  const supabase = await erstelleServerClient()
  const { data, error } = await supabase.from("anfragen").insert(anfrage).select().single()
  if (error) throw error
  return data
}

// anfragen_sichtbar hat keine eigenen Fremdschlüssel-Metadaten (Postgres-View)
// -- PostgREST kann Firmennamen darüber nicht zuverlässig automatisch mit
// einbetten (select=*,firmen(name)). Deshalb zwei getrennte Abfragen mit
// Verknüpfung im Code statt einer riskanten impliziten Einbettung über die View.
export async function holeAnfragen(): Promise<AnfrageMitFirma[]> {
  const supabase = await erstelleServerClient()
  const [{ data: anfragenData, error: anfragenError }, { data: firmenData, error: firmenError }] = await Promise.all([
    supabase.from("anfragen_sichtbar").select("*").order("letzter_kontakt", { ascending: true }),
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

// Wichtiger Fund (M6 Whole-Branch-Review): ein UPDATE, dessen Zeile die
// RLS-USING-Klausel nicht erfüllt (hier: "vermittler aendert anfragen",
// current_rolle() in ('admin','vermittler')), trifft bei Postgres/PostgREST
// null Zeilen -- das ist aus Sicht des Clients ein ERFOLGREICHES Update ohne
// betroffene Zeilen, kein Fehler. Ohne `.select().maybeSingle()` plus
// explizitem Null-Check hier würde ein leser, der versucht eine Anfrage zu
// bearbeiten, scheinbar erfolgreich speichern (AnfrageDetail.speichern()
// verlässt den Bearbeiten-Modus, zeigt "Treffer werden neu berechnet"),
// obwohl in Wahrheit nichts persistiert wurde. `.select("id")` reicht aus,
// um die betroffene Zeile zu bestätigen, ohne die volle Zeile aus der
// (für leser ohnehin gesperrten) Basistabelle zurückzugeben. Gleiches
// Muster (maybeSingle + expliziter Throw statt PostgREST-.single()-Fehler)
// wie bereits in holeVerlaufFuerAnfrage unten.
export async function aktualisiereAnfrage(id: string, aenderung: Partial<AnfrageEinfuegen>): Promise<void> {
  const supabase = await erstelleServerClient()
  const { data, error } = await supabase.from("anfragen").update(aenderung).eq("id", id).select("id").maybeSingle()
  if (error) throw error
  if (!data) throw new Error("Anfrage konnte nicht aktualisiert werden")
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
//
// Der "Anlage"-Zeitpunkt kommt bewusst aus anfragen_sichtbar statt aus der
// anfragen-Basistabelle: Seit der M5-Whole-Branch-Review-Korrektur
// (20260923033041_rls_fix_base_table_read.sql) liest die Basistabelle nur noch
// admin/vermittler, während die View auch leser bedient (maskiert, aber
// lesbar). Diese Funktion wird aus AnfrageDetail (Task 50) aufgerufen, das
// Anfragen aus genau dieser View anzeigt -- ein Zugriff auf die Basistabelle
// hier würde für leser mit .single() auf eine leere Row-Menge treffen und
// werfen, sobald sie den Verlauf eines beliebigen Datensatzes öffnen.
export async function holeVerlaufFuerAnfrage(anfrageId: string): Promise<VerlaufEintrag[]> {
  const supabase = await erstelleServerClient()
  const [
    { data: anfrageData, error: anfrageError },
    { data: matchesData, error: matchesError },
    { data: nachrichtenData, error: nachrichtenError },
  ] = await Promise.all([
    supabase.from("anfragen_sichtbar").select("created_at").eq("id", anfrageId).maybeSingle(),
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
