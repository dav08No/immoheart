import { erstelleServerClient } from "@/lib/supabase/server"
import type { Database } from "@/types/database"

export type NachrichtRow = Database["public"]["Tables"]["nachrichten"]["Row"]
type NachrichtEinfuegen = Database["public"]["Tables"]["nachrichten"]["Insert"]

export async function holeNachrichten(): Promise<NachrichtRow[]> {
  const supabase = await erstelleServerClient()
  const { data, error } = await supabase
    .from("nachrichten")
    .select("*")
    .is("geloescht_am", null)
    .neq("richtung", "entwurf")
    .order("created_at", { ascending: false })
  if (error) throw error
  return data
}

export async function holeNachricht(id: string): Promise<NachrichtRow | null> {
  const supabase = await erstelleServerClient()
  const { data, error } = await supabase.from("nachrichten").select("*").eq("id", id).maybeSingle()
  if (error) throw error
  return data
}

export async function legeNachrichtAn(nachricht: NachrichtEinfuegen): Promise<NachrichtRow> {
  const supabase = await erstelleServerClient()
  const { data, error } = await supabase.from("nachrichten").insert(nachricht).select().single()
  if (error) throw error
  return data
}

export async function aktualisiereNachricht(id: string, aenderung: Partial<NachrichtRow>): Promise<void> {
  const supabase = await erstelleServerClient()
  const { error } = await supabase.from("nachrichten").update(aenderung).eq("id", id)
  if (error) throw error
}

export async function loescheNachricht(id: string): Promise<void> {
  const supabase = await erstelleServerClient()
  const { error } = await supabase.from("nachrichten").delete().eq("id", id)
  if (error) throw error
}

// Atomarer Lösch-und-Rückgabe-Aufruf (statt erst holen, dann getrennt löschen):
// Postgres serialisiert konkurrierende DELETEs auf dieselbe Zeile über
// Row-Level-Locking, sodass von zwei überlappenden Aufrufen für dieselbe id
// (z.B. ein Doppelklick, der die clientseitige Sperre in PostfachAnsicht/
// Task 44 umgeht) nur EINER die Zeile zurückbekommt -- der andere erhält
// garantiert `null` statt derselben, in Wahrheit schon gelöschten Zeile.
// Für `alsAnfrageSpeichern` (Task 39/44), wo genau dieses doppelte Lesen einer
// noch-nicht-gelöschten Zeile sonst zu zwei doppelten Anfragen führen konnte.
export async function loescheUndGibNachrichtZurueck(id: string): Promise<NachrichtRow | null> {
  const supabase = await erstelleServerClient()
  const { data, error } = await supabase.from("nachrichten").delete().eq("id", id).select().maybeSingle()
  if (error) throw error
  return data
}

// Badge Postfach = unbearbeitete Eingänge: nur "eingang" ohne geloescht_am.
// Entwürfe haben mit zaehleEntwuerfe (Task 3, N3) einen eigenen Zähler
// bekommen, weil sie inzwischen eine eigene Ansicht (/admin/entwuerfe) sind.
export async function zaehleNachrichten(): Promise<number> {
  const supabase = await erstelleServerClient()
  const { count, error } = await supabase
    .from("nachrichten")
    .select("*", { count: "exact", head: true })
    .eq("richtung", "eingang")
    .is("geloescht_am", null)
  if (error) throw error
  return count ?? 0
}

export type EntwurfMitBezug = NachrichtRow & { bezug: string | null }

// Bezug klammert die Herkunft ein: Objekttitel (Angebots-Match) vor
// Firmenname vor blossem Ort der Anfrage, damit im Entwürfe-Postfach auf
// einen Blick erkennbar ist, worum es geht, auch ohne die verlinkte
// Anfrage/den Match extra zu öffnen.
export async function holeEntwuerfe(): Promise<EntwurfMitBezug[]> {
  const supabase = await erstelleServerClient()
  const { data, error } = await supabase
    .from("nachrichten")
    .select("*, anfragen(ort, firmen(name)), matches(objekte(titel))")
    .eq("richtung", "entwurf")
    .is("geloescht_am", null)
    .order("created_at", { ascending: false })
  if (error) throw error
  return data.map(({ anfragen, matches, ...n }) => ({
    ...n,
    bezug: matches?.objekte?.titel ?? anfragen?.firmen?.name ?? anfragen?.ort ?? null,
  }))
}

export async function zaehleEntwuerfe(): Promise<number> {
  const supabase = await erstelleServerClient()
  const { count, error } = await supabase
    .from("nachrichten")
    .select("id", { count: "exact", head: true })
    .eq("richtung", "entwurf")
    .is("geloescht_am", null)
  if (error) throw error
  return count ?? 0
}

export async function holeGesendeteIdsFuerAnfrage(anfrageId: string): Promise<string[]> {
  const supabase = await erstelleServerClient()
  const { data, error } = await supabase
    .from("nachrichten")
    .select("message_id")
    .eq("anfrage_id", anfrageId)
    .eq("richtung", "gesendet")
    .not("message_id", "is", null)
    .order("gesendet_am", { ascending: true })
  if (error) throw error
  return data.flatMap((n) => (n.message_id ? [n.message_id] : []))
}

export async function holeLetztenGesendetenBetreff(anfrageId: string): Promise<string | null> {
  const supabase = await erstelleServerClient()
  const { data, error } = await supabase
    .from("nachrichten")
    .select("betreff")
    .eq("anfrage_id", anfrageId)
    .eq("richtung", "gesendet")
    .order("gesendet_am", { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return data?.betreff ?? null
}

// Bedingtes UPDATE als Sperre: nur ein Aufruf bekommt die Zeile zurück, ein
// Doppelklick oder zweiter Tab erhält null und sendet nicht ein zweites Mal.
export async function reserviereEntwurf(id: string): Promise<NachrichtRow | null> {
  const supabase = await erstelleServerClient()
  const { data, error } = await supabase
    .from("nachrichten")
    .update({ gesendet_am: new Date().toISOString(), versand_fehler: null })
    .eq("id", id)
    .eq("richtung", "entwurf")
    .is("gesendet_am", null)
    .is("geloescht_am", null)
    .select()
    .maybeSingle()
  if (error) throw error
  return data
}

export async function gibReservierungFrei(id: string, fehler: string): Promise<void> {
  const supabase = await erstelleServerClient()
  const { error } = await supabase.from("nachrichten").update({ gesendet_am: null, versand_fehler: fehler }).eq("id", id)
  if (error) throw error
}

export async function markiereGesendet(
  id: string,
  felder: { von: string; message_id: string; in_reply_to: string | null; referenzen: string | null }
): Promise<void> {
  const supabase = await erstelleServerClient()
  const { error } = await supabase.from("nachrichten").update({ ...felder, richtung: "gesendet" }).eq("id", id)
  if (error) throw error
}
