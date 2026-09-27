// Speichern eines abgerufenen Mail-Eingangs samt Anhängen (aus lib/queries/eingang.ts
// ausgelagert, Datei-Längenlimit). Admin-Client aus demselben Grund wie dort: Storage-
// Zugriff auf den privaten Bucket; die aufrufende Server Action prüft vorher den Login.
import "server-only"
import { erstelleAdminClient } from "@/lib/supabase/admin"
import type { BestehenderEingang } from "@/lib/mail/eingang"

const DUPLIKAT_CODE = "23505"
const BUCKET = "mail-anhaenge"

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

export type SpeicherErgebnis = { id: string } | { duplikat: BestehenderEingang | null }

// ki_status bleibt null, bis alle Anhänge gespeichert sind (gibEingangFrei): der Claim
// nimmt nur 'offen', also verarbeitet kein anderer Tab eine halb gespeicherte Mail
// (Final-Review I2). Bei bekannter message_id (23505) kein Fehler, sondern die
// bestehende Zeile -- holeNeueMails entscheidet dann, ob sie vollständig ist.
export async function speichereEingang(e: EingangEintrag): Promise<SpeicherErgebnis> {
  const supabase = erstelleAdminClient()
  const { data, error } = await supabase
    .from("nachrichten")
    .insert({
      richtung: "eingang",
      typ: "anfrage",
      quelle: "mail",
      ki_status: null,
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
  if (!error) return data
  if (error.code !== DUPLIKAT_CODE || !e.message_id) throw error
  const { data: bestehend, error: leseFehler } = await supabase
    .from("nachrichten")
    .select("id, richtung, ki_status")
    .eq("message_id", e.message_id)
    .maybeSingle()
  if (leseFehler) throw leseFehler
  return { duplikat: bestehend }
}

// Bedingt auf ki_status null: hat jemand die Zeile in der Zwischenzeit schon manuell
// eingeordnet, bleibt dieses Ergebnis stehen.
export async function gibEingangFrei(id: string): Promise<void> {
  const supabase = erstelleAdminClient()
  const { error } = await supabase.from("nachrichten").update({ ki_status: "offen" }).eq("id", id).is("ki_status", null)
  if (error) throw error
}

export async function speichereAnhang(
  nachrichtId: string,
  a: { dateiname: string; mime: string; inhalt: Buffer; index: number }
): Promise<void> {
  const supabase = erstelleAdminClient()
  const pfad = `${nachrichtId}/${a.index}-${a.dateiname}`
  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(pfad, a.inhalt, { contentType: a.mime, upsert: false })
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

// Entfernt eine unvollständig gespeicherte Mail wieder ganz, damit der nächste Versuch
// sie neu importiert: alle Objekte im Ordner <id>/ (auch Uploads ohne
// nachricht_anhaenge-Zeile, z.B. wenn die Funktion dazwischen beendet wurde) und die
// Zeile selbst (nachricht_anhaenge per ON DELETE CASCADE). Wirft, wenn die Zeile nicht
// gelöscht werden kann -- sonst hielte der Aufrufer sie fälschlich für weg.
export async function verwerfeEingang(nachrichtId: string): Promise<void> {
  const supabase = erstelleAdminClient()
  const { data: objekte, error: listFehler } = await supabase.storage.from(BUCKET).list(nachrichtId, { limit: 1000 })
  if (listFehler) console.error("verwerfeEingang: Anhänge konnten nicht gelistet werden", nachrichtId, listFehler)
  const pfade = (objekte ?? []).map((o) => `${nachrichtId}/${o.name}`)
  if (pfade.length > 0) {
    const { error } = await supabase.storage.from(BUCKET).remove(pfade)
    if (error) console.error("verwerfeEingang: Anhänge konnten nicht entfernt werden", nachrichtId, error)
  }
  const { error } = await supabase.from("nachrichten").delete().eq("id", nachrichtId)
  if (error) throw error
}

// Für die Auswahl vor dem Herunterladen: welche Message-IDs kennt immoheart schon
// (Eingänge wie auch selbst gesendete Mails, die Gmail ebenfalls im Posteingang zeigt)?
export async function holeBekannteMessageIds(ids: string[]): Promise<Map<string, BestehenderEingang>> {
  const bekannt = new Map<string, BestehenderEingang>()
  if (ids.length === 0) return bekannt
  const supabase = erstelleAdminClient()
  const { data, error } = await supabase
    .from("nachrichten")
    .select("id, richtung, ki_status, message_id")
    .in("message_id", ids)
  if (error) throw error
  for (const zeile of data) {
    if (zeile.message_id) bekannt.set(zeile.message_id, { id: zeile.id, richtung: zeile.richtung, ki_status: zeile.ki_status })
  }
  return bekannt
}
