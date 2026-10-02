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

// Badge Postfach = UNGELESENE Eingänge (gelesen = false), nicht bloss alle "eingang"
// ohne geloescht_am (Task 7): sonst bliebe die Zahl nach dem Lesen alter Mails
// dauerhaft hoch, obwohl nichts mehr zu tun ist. Entwürfe haben mit zaehleEntwuerfe
// (Task 3, N3) einen eigenen Zähler, weil sie inzwischen eine eigene Ansicht
// (/admin/entwuerfe) sind.
export async function zaehleNachrichten(): Promise<number> {
  const supabase = await erstelleServerClient()
  const { count, error } = await supabase
    .from("nachrichten")
    .select("*", { count: "exact", head: true })
    .eq("richtung", "eingang")
    .eq("gelesen", false)
    .is("geloescht_am", null)
  if (error) throw error
  return count ?? 0
}

// matchStatus/objektStatus: für die Sendesperre veralteter Angebote (angebotGesperrt), in
// derselben Abfrage mitgeladen statt einer je Entwurf.
export type EntwurfMitBezug = NachrichtRow & {
  bezug: string | null
  matchStatus: Database["public"]["Enums"]["match_status_enum"] | null
  objektStatus: Database["public"]["Enums"]["objekt_status_enum"] | null
}

// Bezug klammert die Herkunft ein: Objekttitel (Angebots-Match) vor
// Firmenname vor blossem Ort der Anfrage, damit im Entwürfe-Postfach auf
// einen Blick erkennbar ist, worum es geht, auch ohne die verlinkte
// Anfrage/den Match extra zu öffnen.
export async function holeEntwuerfe(): Promise<EntwurfMitBezug[]> {
  const supabase = await erstelleServerClient()
  const { data, error } = await supabase
    .from("nachrichten")
    .select("*, anfragen(ort, firmen(name)), matches(status, objekte(titel, status)), objekte(titel)")
    .eq("richtung", "entwurf")
    .is("geloescht_am", null)
    .order("created_at", { ascending: false })
  if (error) throw error
  // objekte direkt: Eigentümer-Infos zum Abschluss tragen objekt_id, aber oft keinen Treffer.
  return data.map(({ anfragen, matches, objekte, ...n }) => ({
    ...n,
    bezug: matches?.objekte?.titel ?? objekte?.titel ?? anfragen?.firmen?.name ?? anfragen?.ort ?? null,
    matchStatus: matches?.status ?? null,
    objektStatus: matches?.objekte?.status ?? null,
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

// Objekt aus einer Mail übernommen (Task 7, "Als Objekt übernehmen" im Postfach): nur
// bei richtung 'eingang' setzen -- WHERE richtung='eingang' ist Teil der UPDATE-
// Bedingung selbst, ein inzwischen anderer Datensatz (z.B. bereits gelöscht oder gar
// kein Eingang mehr) bleibt dann unverändert statt fälschlich verknüpft zu werden.
export async function verknuepfeObjektMitEingang(eingangId: string, objektId: string): Promise<void> {
  const supabase = await erstelleServerClient()
  const { error } = await supabase
    .from("nachrichten")
    .update({ objekt_id: objektId })
    .eq("id", eingangId)
    .eq("richtung", "eingang")
    // Eine schon übernommene Mail behält ihr erstes Objekt (kein stilles Umhängen).
    .is("objekt_id", null)
  if (error) throw error
}

// Manuelle Zuordnung einer Objektmeldung: der beim Einlesen ohne Objekt angelegte Dank-
// Entwurf soll mit am Objekt hängen (Nachholen, Entwurfs-Bezug). Nur offen, nicht gelöscht
// und nur ohne Objekt -- ein bewusst anders gesetzter Bezug bleibt stehen.
export async function verknuepfeDankEntwurfMitObjekt(eingangId: string, objektId: string): Promise<void> {
  const supabase = await erstelleServerClient()
  const { error } = await supabase
    .from("nachrichten")
    .update({ objekt_id: objektId })
    .eq("antwort_auf", eingangId)
    .eq("typ", "eigentuemer_info")
    .eq("richtung", "entwurf")
    .is("geloescht_am", null)
    .is("objekt_id", null)
  if (error) throw error
}

// Versand-Zustandsmaschine (reservieren/senden/markieren/freigeben) steht seit
// N3-Review Fund 1 in lib/queries/versand.ts (Datei-Längenlimit).

// Beim Verwerfen eines Treffers: nur der offene, noch nicht reservierte Angebots-Entwurf.
// Ein gerade reservierter (gesendet_am gesetzt) bleibt, sein Versand läuft womöglich schon.
export async function loescheOffenenAngebotsEntwurf(matchId: string): Promise<void> {
  const supabase = await erstelleServerClient()
  const { error } = await supabase
    .from("nachrichten")
    .update({ geloescht_am: new Date().toISOString() })
    .eq("match_id", matchId)
    .eq("richtung", "entwurf")
    .eq("typ", "angebot")
    .is("gesendet_am", null)
    .is("geloescht_am", null)
  if (error) throw error
}
