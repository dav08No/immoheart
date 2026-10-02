import { erstelleServerClient } from "@/lib/supabase/server"
import type { NachrichtRow } from "@/lib/queries/nachrichten"
import type { Database, Json } from "@/types/database"

type Kategorie = Database["public"]["Enums"]["nachricht_kategorie_enum"]

// Eine Verarbeitung (ordneEin + ein Entwurf) dauert höchstens ~60 s; älter heisst
// abgebrochen (Timeout, Deploy).
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

const ZEITUEBERSCHREITUNG = "Zeitüberschreitung bei der KI-Verarbeitung. Bitte erneut verarbeiten."

// Eine hängengebliebene Verarbeitung (Funktion nach 60 s beendet) wird nicht automatisch
// neu gestartet -- sie würde wieder abbrechen und endlos Kontingent verbrauchen --,
// sondern als Fehler sichtbar, mit "Erneut verarbeiten" (Final-Review I4). Bedingt auf
// laeuft + alt, damit eine inzwischen fertige Zeile nicht überschrieben wird.
async function markiereVeralteteAlsFehler(): Promise<void> {
  const supabase = await erstelleServerClient()
  const { error } = await supabase
    .from("nachrichten")
    .update({ ki_status: "fehler", ki_fehler: ZEITUEBERSCHREITUNG })
    .eq("richtung", "eingang")
    .eq("ki_status", "laeuft")
    .lt("ki_gestartet_am", veraltetGrenze())
  if (error) throw error
}

export async function claimNaechsteOffene(): Promise<NachrichtRow | null> {
  await markiereVeralteteAlsFehler()
  const supabase = await erstelleServerClient()
  // Mehrere Versuche, weil ein paralleler Aufrufer die gerade gelesene Zeile schneller
  // übernehmen kann -- dann ist die nächste dran, statt fälschlich "nichts zu tun".
  for (let versuch = 0; versuch < CLAIM_VERSUCHE; versuch++) {
    const { data, error } = await supabase
      .from("nachrichten")
      .select("id")
      .eq("richtung", "eingang")
      .is("geloescht_am", null)
      .eq("ki_status", "offen")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle()
    if (error) throw error
    if (!data) return null
    const geclaimt = await claimMitFilter(data.id, "ki_status.eq.offen")
    if (geclaimt) return geclaimt
  }
  return null
}

// Anders als claimNaechsteOffene dürfen die manuellen Aktionen eine veraltete
// laeuft-Zeile direkt übernehmen: die Nutzerin hat es ausdrücklich angestossen.
// Für erneutVerarbeiten/kategorieAendern: genau diese Zeile, sofern sie nicht gerade
// (frisch) verarbeitet wird. "abgeschlossen" lässt nur fertig/fehler zu.
export async function claimNachricht(id: string, erlaubt: "abgeschlossen" | "nicht_laufend"): Promise<NachrichtRow | null> {
  const status = erlaubt === "abgeschlossen" ? "ki_status.in.(fertig,fehler)" : "ki_status.is.null,ki_status.neq.laeuft"
  return claimMitFilter(id, `${status},${veraltetLaeuft()}`)
}

// Status bleibt 'laeuft': erst setzeKiFertig gibt die Sperre frei, nachdem auch der
// Entwurf steht -- sonst könnte ein paralleles "erneut verarbeiten" einen zweiten anlegen.
export async function speichereKiErgebnis(
  id: string,
  felder: { kategorie?: Kategorie; erkannte_felder?: Json | null; anfrage_id?: string | null; objekt_id?: string | null }
): Promise<void> {
  const supabase = await erstelleServerClient()
  const { error } = await supabase.from("nachrichten").update(felder).eq("id", id)
  if (error) throw error
}

export async function setzeKiFertig(id: string): Promise<void> {
  const supabase = await erstelleServerClient()
  const { error } = await supabase.from("nachrichten").update({ ki_status: "fertig", ki_fehler: null }).eq("id", id)
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

export type GesendeteImVerlauf = {
  message_id: string
  anfrage_id: string | null
  // Direkt oder über den beantworteten Eingang (Eigentümer-Antwort auf ein Objektangebot).
  objekt_id: string | null
  typ: Database["public"]["Enums"]["nachricht_typ_enum"]
  match_id: string | null
}

// Nur die referenzierten Mails statt aller gesendeten: die Zuordnung braucht nie mehr,
// und die Tabelle wächst unbegrenzt.
export async function holeGesendeteMitAnfrage(messageIds: string[]): Promise<GesendeteImVerlauf[]> {
  if (messageIds.length === 0) return []
  const supabase = await erstelleServerClient()
  const { data, error } = await supabase
    .from("nachrichten")
    .select("message_id, anfrage_id, objekt_id, typ, match_id, antwort_auf")
    .eq("richtung", "gesendet")
    .not("message_id", "is", null)
    .in("message_id", messageIds)
    .order("gesendet_am", { ascending: true })
  if (error) throw error
  const eingangIds = data.flatMap((n) => (!n.objekt_id && n.antwort_auf ? [n.antwort_auf] : []))
  const objektNachEingang = new Map<string, string>()
  if (eingangIds.length > 0) {
    const { data: eingaenge, error: fehler } = await supabase.from("nachrichten").select("id, objekt_id").in("id", eingangIds)
    if (fehler) throw fehler
    for (const e of eingaenge) if (e.objekt_id) objektNachEingang.set(e.id, e.objekt_id)
  }
  return data.flatMap((n) =>
    n.message_id
      ? [{
          message_id: n.message_id,
          anfrage_id: n.anfrage_id,
          objekt_id: n.objekt_id ?? (n.antwort_auf ? (objektNachEingang.get(n.antwort_auf) ?? null) : null),
          typ: n.typ,
          match_id: n.match_id,
        }]
      : []
  )
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
