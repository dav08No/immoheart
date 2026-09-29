// Versand-Zustandsmaschine eines Entwurfs (reservieren -> senden -> markieren, bzw. die
// Ausweich-Pfade "Reservierung freigeben" / "als gesendet markieren"), ausgelagert aus
// nachrichten.ts (N3-Review, Fund 1: Datei war am 200-Zeilen-Limit). nachrichten.ts behält
// die reine CRUD-Basis auf der Tabelle, hier steht alles, was mit einem laufenden oder
// abgeschlossenen Mail-Versand zu tun hat.
import { erstelleServerClient } from "@/lib/supabase/server"
import { RESERVIERUNG_TIMEOUT_MS } from "@/lib/entwurf-status"
import { NutzerFehler } from "@/lib/nutzer-fehler"
import type { NachrichtRow } from "@/lib/queries/nachrichten"

// Dedup-Check vor jedem Angebots-/Nachfass-Entwurf (Ruling R2, "Lücke Empfänger/Nachfass"):
// existiert bereits ein offener (nicht gelöschter) Entwurf, wird dessen id zurückgegeben,
// statt einen zweiten teuren KI-Aufruf auszulösen und einen zweiten Entwurf anzulegen.
export async function holeOffenenAngebotsEntwurf(matchId: string): Promise<NachrichtRow | null> {
  const supabase = await erstelleServerClient()
  const { data, error } = await supabase
    .from("nachrichten")
    .select("*")
    .eq("match_id", matchId)
    .eq("richtung", "entwurf")
    .eq("typ", "angebot")
    .is("geloescht_am", null)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function holeOffenenNachfassEntwurf(anfrageId: string): Promise<NachrichtRow | null> {
  const supabase = await erstelleServerClient()
  const { data, error } = await supabase
    .from("nachrichten")
    .select("*")
    .eq("anfrage_id", anfrageId)
    .eq("richtung", "entwurf")
    .eq("typ", "nachfass")
    .is("geloescht_am", null)
    .maybeSingle()
  if (error) throw error
  return data
}

// Eine Abfrage für alle gelisteten Matches statt N Einzelabfragen (holeNeueMatches):
// liefert die match_id-Menge, für die bereits ein offener Angebots-Entwurf existiert,
// damit die Übersicht "Entwurf öffnen" statt "Angebot entwerfen" zeigen kann.
export async function holeMatchIdsMitOffenemEntwurf(matchIds: string[]): Promise<Set<string>> {
  if (matchIds.length === 0) return new Set()
  const supabase = await erstelleServerClient()
  const { data, error } = await supabase
    .from("nachrichten")
    .select("match_id")
    .in("match_id", matchIds)
    .eq("richtung", "entwurf")
    .eq("typ", "angebot")
    .is("geloescht_am", null)
  if (error) throw error
  return new Set(data.flatMap((n) => (n.match_id ? [n.match_id] : [])))
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
    .not("message_id", "is", null)
    .order("gesendet_am", { ascending: false, nullsFirst: false })
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

// .eq("richtung", "entwurf") (N3-Review, Hardening): ohne diese Bedingung könnte ein
// spät eintreffender Aufruf (z.B. nach einer Race mit markiereGesendet) versehentlich
// eine bereits als "gesendet" markierte Zeile wieder auf gesendet_am=null zurücksetzen
// und damit erneut sendbar machen -- genau der Doppelversand, den die gesamte
// Reservierungs-Logik verhindern soll.
export async function gibReservierungFrei(id: string, fehler: string): Promise<void> {
  const supabase = await erstelleServerClient()
  const { error } = await supabase
    .from("nachrichten")
    .update({ gesendet_am: null, versand_fehler: fehler })
    .eq("id", id)
    .eq("richtung", "entwurf")
  if (error) throw error
}

// Löst eine festsitzende Reservierung ("Versand unklar"): richtung noch
// "entwurf", aber gesendet_am bereits gesetzt -- z.B. weil der Server zwischen
// reserviereEntwurf und markiereGesendet/gibReservierungFrei abgestürzt ist.
// Anders als gibReservierungFrei wird versand_fehler bewusst NICHT verändert:
// ein vorheriger Hinweis "Mail wurde gesendet, Status konnte nicht gespeichert
// werden" darf beim blossen Freigeben nicht verloren gehen. Die Bedingung ist
// die Umkehrung von reserviereEntwurf (dort .is("gesendet_am", null), hier
// .not(...)), damit nur ein tatsächlich reservierter Entwurf getroffen wird.
// Zusätzlich .lt("gesendet_am", grenze) (N3-Review, Fund 1): entwurfSenden könnte
// zwischen dem Lesen in reservierungFreigeben (app/actions/entwuerfe.ts) und diesem
// UPDATE noch mitten im SMTP-Versand stecken -- die DB-Bedingung ist die zweite,
// unumgehbare Verteidigungslinie hinter der clientseitigen "Wird gesendet…"-Anzeige
// und dem Alters-Check in der Server Action.
export async function gibFestsitzendeReservierungFrei(id: string): Promise<void> {
  const supabase = await erstelleServerClient()
  const grenze = new Date(Date.now() - RESERVIERUNG_TIMEOUT_MS).toISOString()
  const { data, error } = await supabase
    .from("nachrichten")
    .update({ gesendet_am: null })
    .eq("id", id)
    .eq("richtung", "entwurf")
    .not("gesendet_am", "is", null)
    .lt("gesendet_am", grenze)
    .is("geloescht_am", null)
    .select("id")
    .maybeSingle()
  if (error) throw error
  if (!data) throw new NutzerFehler("Der Versand läuft möglicherweise noch. Bitte in zwei Minuten erneut prüfen.")
}

// Gegenstück für den Fall, dass die Mail laut Gmail-Ordner "Gesendet" tatsächlich
// rausgegangen ist (alsGesendetMarkieren, app/actions/entwuerfe.ts): dieselbe
// Bedingung wie gibFestsitzendeReservierungFrei (reservierter, nicht gelöschter
// Entwurf, mit derselben 2-Minuten-Grenze -- N3-Review, Hardening: auch eine von der
// Nutzerin bestätigte Gmail-Prüfung darf einen möglicherweise noch laufenden Versand
// nicht als abgeschlossen markieren). gesendet_am bleibt unverändert (Zeitpunkt der
// ursprünglichen Reservierung/des Versands), message_id bleibt null, da keine echte
// Message-ID bekannt ist.
export async function markiereAlsManuellGesendet(id: string): Promise<NachrichtRow> {
  const supabase = await erstelleServerClient()
  const grenze = new Date(Date.now() - RESERVIERUNG_TIMEOUT_MS).toISOString()
  const { data, error } = await supabase
    .from("nachrichten")
    .update({ richtung: "gesendet" })
    .eq("id", id)
    .eq("richtung", "entwurf")
    .not("gesendet_am", "is", null)
    .lt("gesendet_am", grenze)
    .is("geloescht_am", null)
    .select()
    .maybeSingle()
  if (error) throw error
  if (!data) throw new NutzerFehler("Der Versand läuft möglicherweise noch. Bitte in zwei Minuten erneut prüfen.")
  return data
}

// .eq("richtung", "entwurf") + geprüfte Rückgabezeile: die Mail ist zu diesem
// Zeitpunkt bereits beim SMTP-Server abgeliefert, ein UPDATE ohne Treffer
// (z.B. weil die Zeile inzwischen anderweitig verändert wurde) darf hier
// NICHT still verschluckt werden -- der Aufrufer muss den Sonderfall
// "gesendet, aber Status nicht gespeichert" erkennen und behandeln können.
export async function markiereGesendet(
  id: string,
  felder: { von: string; message_id: string; in_reply_to: string | null; referenzen: string | null; gesendet_am: string }
): Promise<void> {
  const supabase = await erstelleServerClient()
  const { data, error } = await supabase
    .from("nachrichten")
    .update({ ...felder, richtung: "gesendet" })
    .eq("id", id)
    .eq("richtung", "entwurf")
    .select("id")
    .maybeSingle()
  if (error) throw error
  if (!data) throw new NutzerFehler("Nachricht konnte nicht als gesendet markiert werden")
}
