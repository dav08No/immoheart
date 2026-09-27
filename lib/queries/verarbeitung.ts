import { erstelleServerClient } from "@/lib/supabase/server"
import type { NachrichtRow } from "@/lib/queries/nachrichten"
import type { Database, Json } from "@/types/database"

type Kategorie = Database["public"]["Enums"]["nachricht_kategorie_enum"]

// Eine Verarbeitung (ordneEin + ein Entwurf) dauert höchstens ~60 s; älter heisst
// abgebrochen (Timeout, Deploy) und darf neu übernommen werden.
const KI_SPERRE_MS = 2 * 60_000
const CLAIM_VERSUCHE = 3

function veraltetGrenze(): string {
  return new Date(Date.now() - KI_SPERRE_MS).toISOString()
}

function veraltetLaeuft(): string {
  return `and(ki_status.eq.laeuft,ki_gestartet_am.lt.${veraltetGrenze()})`
}

// Bedingtes UPDATE (gleiche Bedingung + id): Postgres serialisiert es, darum bekommt
// von zwei gleichzeitigen Aufrufern nur einer die Zeile zurück.
async function claimMitFilter(id: string, filter: string): Promise<NachrichtRow | null> {
  const supabase = await erstelleServerClient()
  const { data, error } = await supabase
    .from("nachrichten")
    .update({ ki_status: "laeuft", ki_gestartet_am: new Date().toISOString(), ki_fehler: null })
    .eq("id", id)
    .eq("richtung", "eingang")
    .is("geloescht_am", null)
    .or(filter)
    .select()
    .maybeSingle()
  if (error) throw error
  return data
}

export async function claimNaechsteOffene(): Promise<NachrichtRow | null> {
  const supabase = await erstelleServerClient()
  // Mehrere Versuche, weil ein paralleler Aufrufer die gerade gelesene Zeile schneller
  // übernehmen kann -- dann ist die nächste dran, statt fälschlich "nichts zu tun".
  for (let versuch = 0; versuch < CLAIM_VERSUCHE; versuch++) {
    const filter = `ki_status.eq.offen,${veraltetLaeuft()}`
    const { data, error } = await supabase
      .from("nachrichten")
      .select("id")
      .eq("richtung", "eingang")
      .is("geloescht_am", null)
      .or(filter)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle()
    if (error) throw error
    if (!data) return null
    const geclaimt = await claimMitFilter(data.id, filter)
    if (geclaimt) return geclaimt
  }
  return null
}

// Für erneutVerarbeiten/kategorieAendern: genau diese Zeile, sofern sie nicht gerade
// (frisch) verarbeitet wird. "abgeschlossen" lässt nur fertig/fehler zu.
export async function claimNachricht(id: string, erlaubt: "abgeschlossen" | "nicht_laufend"): Promise<NachrichtRow | null> {
  const status = erlaubt === "abgeschlossen" ? "ki_status.in.(fertig,fehler)" : "ki_status.is.null,ki_status.neq.laeuft"
  return claimMitFilter(id, `${status},${veraltetLaeuft()}`)
}

export async function setzeKiErgebnis(
  id: string,
  felder: { kategorie: Kategorie; erkannte_felder: Json | null; anfrage_id?: string | null }
): Promise<void> {
  const supabase = await erstelleServerClient()
  const { error } = await supabase
    .from("nachrichten")
    .update({ ...felder, ki_status: "fertig", ki_fehler: null })
    .eq("id", id)
  if (error) throw error
}

export async function setzeKiFehler(id: string, text: string): Promise<void> {
  const supabase = await erstelleServerClient()
  const { error } = await supabase
    .from("nachrichten")
    .update({ ki_status: "fehler", ki_fehler: text.slice(0, 300) })
    .eq("id", id)
  if (error) throw error
}

// Nur die referenzierten Mails statt aller gesendeten: die Zuordnung braucht nie mehr,
// und die Tabelle wächst unbegrenzt.
export async function holeGesendeteMitAnfrage(
  messageIds: string[]
): Promise<{ message_id: string; anfrage_id: string | null }[]> {
  if (messageIds.length === 0) return []
  const supabase = await erstelleServerClient()
  const { data, error } = await supabase
    .from("nachrichten")
    .select("message_id, anfrage_id")
    .eq("richtung", "gesendet")
    .not("message_id", "is", null)
    .in("message_id", messageIds)
    .order("gesendet_am", { ascending: true })
  if (error) throw error
  return data.flatMap((n) => (n.message_id ? [{ message_id: n.message_id, anfrage_id: n.anfrage_id }] : []))
}

export async function holeOffeneAnfragenNachAbsender(): Promise<Record<string, string[]>> {
  const supabase = await erstelleServerClient()
  const { data, error } = await supabase.from("anfragen").select("id, firmen(kontakt_email)").eq("status", "offen")
  if (error) throw error
  const nachAbsender: Record<string, string[]> = {}
  for (const a of data) {
    const email = a.firmen?.kontakt_email?.trim().toLowerCase()
    if (!email) continue
    nachAbsender[email] = [...(nachAbsender[email] ?? []), a.id]
  }
  return nachAbsender
}

export async function hatOffenenEntwurfZu(eingangId: string): Promise<boolean> {
  const supabase = await erstelleServerClient()
  const { count, error } = await supabase
    .from("nachrichten")
    .select("id", { count: "exact", head: true })
    .eq("antwort_auf", eingangId)
    .eq("richtung", "entwurf")
    .is("geloescht_am", null)
  if (error) throw error
  return (count ?? 0) > 0
}

export async function hatBildAnhang(nachrichtId: string): Promise<boolean> {
  const supabase = await erstelleServerClient()
  const { count, error } = await supabase
    .from("nachricht_anhaenge")
    .select("id", { count: "exact", head: true })
    .eq("nachricht_id", nachrichtId)
    .like("mime_type", "image/%")
  if (error) throw error
  return (count ?? 0) > 0
}
