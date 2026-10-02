import "server-only"
import { erstelleServerClient } from "@/lib/supabase/server"
import { erstelleAdminClient } from "@/lib/supabase/admin"
import type { NachrichtRow } from "@/lib/queries/nachrichten"

export type PostfachNachricht = NachrichtRow & { anhangTypen: string[] }

// Anhang-Typen direkt mitgeladen (eine Abfrage statt einer zweiten mit allen IDs im
// URL-Filter, der bei vielen Nachrichten zu lang würde) -- für die Badges "2 Bilder"/"PDF".
export async function holePostfachNachrichten(): Promise<PostfachNachricht[]> {
  const supabase = await erstelleServerClient()
  const { data, error } = await supabase
    .from("nachrichten")
    .select("*, nachricht_anhaenge(mime_type)")
    .is("geloescht_am", null)
    .neq("richtung", "entwurf")
    .order("created_at", { ascending: false })
  if (error) throw error
  return data.map(({ nachricht_anhaenge, ...n }) => ({ ...n, anhangTypen: nachricht_anhaenge.map((a) => a.mime_type) }))
}

// "Firma lehnt ab" nur für Treffer, die noch "Angeboten" sind (Spec §2); ohne Kandidaten
// keine Abfrage. Die IDs stammen aus Antworten mit kein_interesse, also wenige.
export async function holeAngeboteneTreffer(matchIds: string[]): Promise<string[]> {
  if (matchIds.length === 0) return []
  const supabase = await erstelleServerClient()
  const { data, error } = await supabase.from("matches").select("id").in("id", matchIds).eq("status", "gesendet")
  if (error) throw error
  return data.map((m) => m.id)
}

export type AnhangLink = {
  id: string
  dateiname: string
  mime_type: string
  groesse: number
  url: string
  downloadUrl: string
}

const GUELTIG_SEKUNDEN = 600

// Admin-Client, weil der Bucket bewusst keine storage.objects-Policies für Nutzerrollen
// hat -- der Aufrufer (Server Action) prüft den Login vorher.
export async function holeAnhangLinks(nachrichtId: string): Promise<AnhangLink[]> {
  const supabase = erstelleAdminClient()
  const { data: zeilen, error } = await supabase
    .from("nachricht_anhaenge")
    .select("id, pfad, dateiname, mime_type, groesse")
    .eq("nachricht_id", nachrichtId)
    .order("created_at", { ascending: true })
  if (error) throw error
  if (zeilen.length === 0) return []

  const bucket = supabase.storage.from("mail-anhaenge")
  const { data: ansicht, error: ansichtFehler } = await bucket.createSignedUrls(
    zeilen.map((z) => z.pfad),
    GUELTIG_SEKUNDEN
  )
  if (ansichtFehler) throw ansichtFehler
  // Einzeln, weil nur createSignedUrl einen eigenen Download-Dateinamen je Datei kennt
  // (sonst hiesse die Datei nach dem Speicherpfad "0-foto.jpg").
  const downloads = await Promise.all(
    zeilen.map((z) => bucket.createSignedUrl(z.pfad, GUELTIG_SEKUNDEN, { download: z.dateiname }))
  )

  return zeilen.flatMap((z, i) => {
    const url = ansicht.find((a) => a.path === z.pfad)?.signedUrl
    const downloadUrl = downloads[i]?.data?.signedUrl
    if (!url || !downloadUrl) {
      console.error("holeAnhangLinks: keine signierte URL", z.pfad)
      return []
    }
    return [{ id: z.id, dateiname: z.dateiname, mime_type: z.mime_type, groesse: z.groesse, url, downloadUrl }]
  })
}

// Erst die Datei, dann die Zeile: scheitert das Löschen der Zeile, kann die Nutzerin es
// einfach erneut versuchen (remove auf eine fehlende Datei ist kein Fehler). Umgekehrt
// bliebe eine unsichtbare, nie mehr auffindbare Datei im Bucket liegen.
export async function loescheAnhang(id: string): Promise<boolean> {
  const supabase = erstelleAdminClient()
  const { data: anhang, error } = await supabase.from("nachricht_anhaenge").select("pfad").eq("id", id).maybeSingle()
  if (error) throw error
  if (!anhang) return false
  const { error: dateiFehler } = await supabase.storage.from("mail-anhaenge").remove([anhang.pfad])
  if (dateiFehler) throw dateiFehler
  const { error: zeilenFehler } = await supabase.from("nachricht_anhaenge").delete().eq("id", id)
  if (zeilenFehler) throw zeilenFehler
  return true
}
