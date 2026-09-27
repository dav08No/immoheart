// Admin-Client statt erstelleServerClient (server-only): der Mail-Abruf schreibt in den
// privaten Storage-Bucket mail-anhaenge und läuft ausserhalb einer normalen
// Nutzer-Session (Cron/Server Action ohne Formular-Kontext) -- die aufrufende Server
// Action prüft den Login (holeEigenesProfil) VOR jedem Aufruf hier, RLS würde die
// eigentliche Arbeit also nicht zusätzlich absichern, nur den Storage-Zugriff verhindern.
import "server-only"
import { erstelleAdminClient } from "@/lib/supabase/admin"

const ABRUF_ID = 1
const SPERRE_DAUER_MS = 60_000
const DUPLIKAT_CODE = "23505"
// Schutz vor einer übergrossen Fehlermeldung (z.B. ein voller Stacktrace-String eines
// Drittpakets) in der ohnehin nur als kurzer Hinweis gedachten Statusspalte.
const MAX_FEHLER_LAENGE = 300

// Bedingtes UPDATE als Sperre (gleiches Muster wie reserviereEntwurf, lib/queries/
// versand.ts): die WHERE-Bedingung (id + Zeit-Fenster) und das UPDATE laufen in einem
// einzigen, von Postgres serialisierten Statement -- nur ein gleichzeitiger Aufruf
// (zweiter Tab, überlappender Cron-Trigger) bekommt die Zeile zurück und darf abrufen.
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

export type EingangEintrag = {
  message_id: string | null
  in_reply_to: string | null
  referenzen: string | null
  von: string
  betreff: string
  body: string
  empfangen_am: string | null
  anhaenge: string[]
}

// Liefert null bei einer bereits bekannten message_id (Unique-Verletzung 23505) statt zu
// werfen: holeNeueMails behandelt das als bereits gespeichertes Duplikat, nicht als
// Fehler -- kann vorkommen, wenn ein früherer Abruf zwischen dem Speichern dieser Zeile
// und dem Markieren als gelesen abgebrochen ist und dieselbe Mail erneut sieht.
export async function speichereEingang(e: EingangEintrag): Promise<{ id: string } | null> {
  const supabase = erstelleAdminClient()
  const { data, error } = await supabase
    .from("nachrichten")
    .insert({
      richtung: "eingang",
      typ: "anfrage",
      quelle: "mail",
      ki_status: "offen",
      an: process.env.GMAIL_USER ?? "",
      message_id: e.message_id,
      in_reply_to: e.in_reply_to,
      referenzen: e.referenzen,
      von: e.von,
      betreff: e.betreff,
      body: e.body,
      empfangen_am: e.empfangen_am,
      anhaenge: e.anhaenge,
    })
    .select("id")
    .single()
  if (error) {
    if (error.code === DUPLIKAT_CODE) return null
    throw error
  }
  return data
}

// Deterministisch aus nachrichtId/index/dateiname statt von speichereAnhang zurückgegeben:
// verwerfeEingang (Fix-Runde 1) muss denselben Pfad auch dann kennen, wenn speichereAnhang
// nach dem Hochladen aber vor der Rückgabe scheitert (z.B. beim nachricht_anhaenge-Insert).
function anhangPfad(nachrichtId: string, index: number, dateiname: string): string {
  return `${nachrichtId}/${index}-${dateiname}`
}

export async function speichereAnhang(
  nachrichtId: string,
  a: { dateiname: string; mime: string; inhalt: Buffer; index: number }
): Promise<void> {
  const supabase = erstelleAdminClient()
  const pfad = anhangPfad(nachrichtId, a.index, a.dateiname)
  const { error: uploadError } = await supabase.storage
    .from("mail-anhaenge")
    .upload(pfad, a.inhalt, { contentType: a.mime, upsert: false })
  if (uploadError) throw uploadError
  const { error } = await supabase.from("nachricht_anhaenge").insert({
    nachricht_id: nachrichtId,
    pfad,
    dateiname: a.dateiname,
    mime_type: a.mime,
    groesse: a.inhalt.length,
  })
  if (error) throw error
}

// Aufräumen nach einem fehlgeschlagenen Anhang (Fix-Runde 1, Task-Review): schlägt
// speichereAnhang für irgendeinen Anhang fehl, bleibt sonst eine Nachrichten-Zeile mit
// unvollständigen Anhängen stehen, die nie erneut versucht wird (message_id ist bereits
// vergeben, ein erneuter Abruf hält sie für ein Duplikat und markiert sie nur als
// gelesen). Entfernt deshalb sowohl die schon hochgeladenen Storage-Objekte als auch die
// gerade erst eingefügte nachrichten-Zeile (löscht per ON DELETE CASCADE auch etwaige
// nachricht_anhaenge-Zeilen) -- der Aufrufer markiert die Mail danach NICHT als gelesen,
// der nächste Abruf sieht sie wieder komplett neu. Nimmt bewusst alle für diese Mail
// vorgesehenen Anhänge entgegen (nicht nur die erfolgreich hochgeladenen): ein Pfad, der
// nie hochgeladen wurde, existiert im Bucket schlicht nicht und remove() ignoriert das.
// Eigene Fehler werden nur geloggt, nicht geworfen -- sie dürfen den ursprünglichen
// Fehler, wegen dem aufgeräumt wird, nicht überdecken.
export async function verwerfeEingang(
  nachrichtId: string,
  anhaenge: { dateiname: string; index: number }[]
): Promise<void> {
  const supabase = erstelleAdminClient()
  if (anhaenge.length > 0) {
    const pfade = anhaenge.map((a) => anhangPfad(nachrichtId, a.index, a.dateiname))
    const { error } = await supabase.storage.from("mail-anhaenge").remove(pfade)
    if (error) console.error("verwerfeEingang: Anhänge konnten nicht aus dem Bucket entfernt werden", nachrichtId, error)
  }
  const { error } = await supabase.from("nachrichten").delete().eq("id", nachrichtId)
  if (error) console.error("verwerfeEingang: Nachricht konnte nicht gelöscht werden", nachrichtId, error)
}
