import { erstelleServerClient } from "@/lib/supabase/server"
import type { Database } from "@/types/database"

export type NachrichtRow = Database["public"]["Tables"]["nachrichten"]["Row"]
type NachrichtEinfuegen = Database["public"]["Tables"]["nachrichten"]["Insert"]

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

// Bedingtes UPDATE statt eines separaten Lösch-Schritts (gleiches Muster wie
// sperreAbruf/reserviereEntwurf): trifft die WHERE-Bedingung `anfrage_id is null`
// nicht mehr, war ein zweiter, überlappender alsAnfrageSpeichern-Aufruf für
// dieselbe Nachricht schneller -- der Aufrufer muss dann seine eigene, gerade
// erst angelegte Anfrage wieder verwerfen statt eine zweite gültige stehen zu lassen.
export async function setzeAnfrageIdFallsLeer(id: string, anfrageId: string): Promise<boolean> {
  const supabase = await erstelleServerClient()
  const { data, error } = await supabase
    .from("nachrichten")
    .update({ anfrage_id: anfrageId })
    .eq("id", id)
    .is("anfrage_id", null)
    .select("id")
  if (error) throw error
  return (data?.length ?? 0) > 0
}

// Rückfrage-Entwürfe UND bereits gesendete Rückfragen zu diesem Eingang auf die neue
// Anfrage umhängen: Senden pflegt anfragen.letzter_kontakt nur, wenn der Entwurf eine
// anfrage_id trägt, und spätere Antworten der Firma sollen über den Verlauf
// (findeAnfrageFuerAntwort) wieder bei derselben Anfrage landen.
export async function verknuepfeAntwortenMitAnfrage(eingangId: string, anfrageId: string): Promise<void> {
  const supabase = await erstelleServerClient()
  const { error } = await supabase
    .from("nachrichten")
    .update({ anfrage_id: anfrageId })
    .eq("antwort_auf", eingangId)
    .in("richtung", ["entwurf", "gesendet"])
  if (error) throw error
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

// Versand-Zustandsmaschine (reservieren/senden/markieren/freigeben) steht seit
// N3-Review Fund 1 in lib/queries/versand.ts (Datei-Längenlimit).
