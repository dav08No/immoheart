// Admin-Client statt erstelleServerClient (server-only): der Mail-Abruf schreibt in den
// privaten Storage-Bucket mail-anhaenge und läuft ausserhalb einer normalen
// Nutzer-Session (Server Action ohne Formular-Kontext) -- die aufrufende Server
// Action prüft den Login (holeEigenesProfil) VOR jedem Aufruf hier, RLS würde die
// eigentliche Arbeit also nicht zusätzlich absichern, nur den Storage-Zugriff verhindern.
import "server-only"
import { erstelleAdminClient } from "@/lib/supabase/admin"

const ABRUF_ID = 1
const SPERRE_DAUER_MS = 60_000
// Schutz vor einer übergrossen Fehlermeldung (z.B. ein voller Stacktrace-String eines
// Drittpakets) in der ohnehin nur als kurzer Hinweis gedachten Statusspalte.
const MAX_FEHLER_LAENGE = 300

// Bedingtes UPDATE als Sperre (gleiches Muster wie reserviereEntwurf, lib/queries/
// versand.ts): die WHERE-Bedingung (id + Zeit-Fenster) und das UPDATE laufen in einem
// einzigen, von Postgres serialisierten Statement -- nur ein gleichzeitiger Aufruf
// (zweiter Tab, zweites Gerät) bekommt die Zeile zurück und darf abrufen.
export async function sperreAbruf(): Promise<boolean> {
  const supabase = erstelleAdminClient()
  const grenze = new Date(Date.now() - SPERRE_DAUER_MS).toISOString()
  const { data, error } = await supabase
    .from("mail_abruf")
    .update({ letzter_start: new Date().toISOString() })
    .eq("id", ABRUF_ID)
    .or(`letzter_start.is.null,letzter_start.lt.${grenze}`)
    .select("id")
  if (error) throw error
  return (data?.length ?? 0) > 0
}

export async function abrufErfolg(): Promise<void> {
  const supabase = erstelleAdminClient()
  const { error } = await supabase
    .from("mail_abruf")
    .update({ letzter_erfolg: new Date().toISOString() })
    .eq("id", ABRUF_ID)
  if (error) throw error
}

export async function abrufFehler(text: string): Promise<void> {
  const supabase = erstelleAdminClient()
  const { error } = await supabase
    .from("mail_abruf")
    .update({ letzter_fehler: text.slice(0, MAX_FEHLER_LAENGE), letzter_fehler_am: new Date().toISOString() })
    .eq("id", ABRUF_ID)
  if (error) throw error
}

export type AbrufStatus = { letzterErfolg: string | null; letzterFehler: string | null; letzterFehlerAm: string | null }

export async function holeAbrufStatus(): Promise<AbrufStatus> {
  const supabase = erstelleAdminClient()
  const { data, error } = await supabase
    .from("mail_abruf")
    .select("letzter_erfolg, letzter_fehler, letzter_fehler_am")
    .eq("id", ABRUF_ID)
    .maybeSingle()
  if (error) throw error
  return {
    letzterErfolg: data?.letzter_erfolg ?? null,
    letzterFehler: data?.letzter_fehler ?? null,
    letzterFehlerAm: data?.letzter_fehler_am ?? null,
  }
}
