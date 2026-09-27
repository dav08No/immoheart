// Objektfotos im Admin. Zeilen über den Server-Client (RLS "aktives konto" greift als
// zweite Sperre), Storage über den Admin-Client: der Bucket hat keine storage.objects-
// Policies für Nutzerrollen. Aufrufer (Server Actions/Seiten) prüfen vorher den Login.
import "server-only"
import { randomUUID } from "node:crypto"
import { erstelleServerClient } from "@/lib/supabase/server"
import { erstelleAdminClient } from "@/lib/supabase/admin"
import { NutzerFehler } from "@/lib/nutzer-fehler"
import {
  erstesJeObjekt, FOTO_BUCKET, FORMAT_FEHLER, istFotoMime, istVollstaendigeReihenfolge,
  MAX_FOTO_BYTES, naechsteReihenfolge, neuerFotoPfad, pruefeFoto, zerlegeFotoPfad, type FotoMime,
} from "@/lib/objekt-fotos"

export type Foto = { id: string; pfad: string; reihenfolge: number; url: string }

const ID_PORTION = 50
// PostgREST liefert höchstens 1000 Zeilen je Anfrage -- darüber hinaus seitenweise.
const SEITE = 1000

function oeffentlicheUrl(pfad: string): string {
  return erstelleAdminClient().storage.from(FOTO_BUCKET).getPublicUrl(pfad).data.publicUrl
}

export async function holeFotos(objektId: string): Promise<Foto[]> {
  const supabase = await erstelleServerClient()
  const { data, error } = await supabase
    .from("objekt_fotos")
    .select("id, pfad, reihenfolge")
    .eq("objekt_id", objektId)
    .order("reihenfolge")
    .order("created_at")
  if (error) throw error
  return data.map((f) => ({ ...f, url: oeffentlicheUrl(f.pfad) }))
}

// In Portionen, damit der id-Filter in der URL bei vielen Objekten nicht zu lang wird.
export async function holeTitelbilder(objektIds: string[]): Promise<Record<string, string>> {
  const supabase = await erstelleServerClient()
  const ergebnis: Record<string, string> = {}
  const eindeutig = [...new Set(objektIds)]
  for (let i = 0; i < eindeutig.length; i += ID_PORTION) {
    const portion = eindeutig.slice(i, i + ID_PORTION)
    for (let von = 0; ; von += SEITE) {
      const { data, error } = await supabase
        .from("objekt_fotos")
        .select("objekt_id, pfad")
        .in("objekt_id", portion)
        .order("objekt_id")
        .order("reihenfolge")
        .order("created_at")
        .order("id")
        .range(von, von + SEITE - 1)
      if (error) throw error
      // Sortiert nach objekt_id: das erste Foto eines Objekts kommt immer vor seinen übrigen.
      for (const [objektId, foto] of erstesJeObjekt(data)) {
        if (!(objektId in ergebnis)) ergebnis[objektId] = oeffentlicheUrl(foto.pfad)
      }
      if (data.length < SEITE) break
    }
  }
  return ergebnis
}

async function pruefeObjekt(objektId: string): Promise<void> {
  const supabase = await erstelleServerClient()
  const { data, error } = await supabase.from("objekte").select("id").eq("id", objektId).maybeSingle()
  if (error) throw error
  if (!data) throw new NutzerFehler("Objekt nicht gefunden.")
}

export async function erstelleUploadZiel(
  objektId: string,
  mime: FotoMime,
): Promise<{ pfad: string; token: string; signedUrl: string }> {
  await pruefeObjekt(objektId)
  const pfad = neuerFotoPfad(objektId, randomUUID(), mime)
  const { data, error } = await erstelleAdminClient().storage.from(FOTO_BUCKET).createSignedUploadUrl(pfad)
  if (error) throw error
  return { pfad, token: data.token, signedUrl: data.signedUrl }
}

// Gibt "duplikat" zurück statt zu werfen: dann gehört die Datei bereits zu einer Zeile
// und darf vom Aufrufer nicht gelöscht werden.
async function fuegeFotoAn(objektId: string, pfad: string): Promise<"ok" | "duplikat"> {
  const supabase = await erstelleServerClient()
  const { data: vorhanden, error: lesefehler } = await supabase
    .from("objekt_fotos")
    .select("reihenfolge")
    .eq("objekt_id", objektId)
  if (lesefehler) throw lesefehler
  const { error } = await supabase
    .from("objekt_fotos")
    .insert({ objekt_id: objektId, pfad, reihenfolge: naechsteReihenfolge(vorhanden) })
  if (error?.code === "23505") return "duplikat"
  if (error) throw error
  return "ok"
}

const DUPLIKAT_MELDUNG = "Dieses Foto ist bereits gespeichert."

// Die Datei muss wirklich hochgeladen sein und den Regeln entsprechen -- der Bucket
// prüft das zwar auch, aber metadata ist die einzige Stelle, die der Server selbst sieht.
export async function registriereFoto(objektId: string, pfad: string): Promise<void> {
  const teile = zerlegeFotoPfad(pfad, objektId)
  if (!teile) throw new NutzerFehler("Ungültiger Foto-Pfad.")
  const ordner = pfad.slice(0, pfad.indexOf("/"))
  const { data, error } = await erstelleAdminClient()
    .storage.from(FOTO_BUCKET)
    .list(ordner, { search: teile.dateiname, limit: 10 })
  if (error) throw error
  const datei = data.find((d) => d.name === teile.dateiname)
  if (!datei) throw new NutzerFehler("Das Foto wurde nicht vollständig hochgeladen.")
  const mime = typeof datei.metadata?.mimetype === "string" ? datei.metadata.mimetype : ""
  const groesse = typeof datei.metadata?.size === "number" ? datei.metadata.size : 0
  const problem = pruefeFoto(mime, groesse)
  if (problem) {
    await entferneDatei(pfad)
    throw new NutzerFehler(problem)
  }
  let ergebnis: "ok" | "duplikat"
  try {
    await pruefeObjekt(objektId)
    ergebnis = await fuegeFotoAn(objektId, pfad)
  } catch (e) {
    // Ohne Zeile wäre die Datei verwaist (öffentlich erreichbar, aber nirgends verwaltet).
    await entferneDatei(pfad)
    throw e
  }
  if (ergebnis === "duplikat") throw new NutzerFehler(DUPLIKAT_MELDUNG)
}

export async function setzeReihenfolge(objektId: string, ids: string[]): Promise<void> {
  const supabase = await erstelleServerClient()
  const { data, error } = await supabase.from("objekt_fotos").select("id").eq("objekt_id", objektId)
  if (error) throw error
  if (!istVollstaendigeReihenfolge(data.map((f) => f.id), ids)) {
    throw new NutzerFehler("Die Fotos wurden inzwischen geändert. Bitte neu laden.")
  }
  const ergebnisse = await Promise.all(
    ids.map((id, index) =>
      supabase.from("objekt_fotos").update({ reihenfolge: index }).eq("id", id).eq("objekt_id", objektId),
    ),
  )
  const fehler = ergebnisse.find((e) => e.error)?.error
  if (fehler) throw fehler
}

async function entferneDatei(pfad: string): Promise<void> {
  const { error } = await erstelleAdminClient().storage.from(FOTO_BUCKET).remove([pfad])
  if (error) console.error("entferneDatei", pfad, error)
}

// Zuerst die Zeile: bleibt dann die Datei liegen, ist das nur verwaister Speicher statt
// eines kaputten Bilds auf der Website.
export async function loescheFoto(id: string): Promise<void> {
  const supabase = await erstelleServerClient()
  const { data, error } = await supabase.from("objekt_fotos").delete().eq("id", id).select("pfad").maybeSingle()
  if (error) throw error
  if (!data) throw new NutzerFehler("Foto nicht gefunden.")
  await entferneDatei(data.pfad)
}

export async function kopiereAusMailAnhang(anhangId: string, objektId: string): Promise<void> {
  const supabase = await erstelleServerClient()
  const { data: anhang, error } = await supabase
    .from("nachricht_anhaenge")
    .select("pfad, mime_type, groesse")
    .eq("id", anhangId)
    .maybeSingle()
  if (error) throw error
  if (!anhang) throw new NutzerFehler("Anhang nicht gefunden.")
  if (!istFotoMime(anhang.mime_type)) throw new NutzerFehler(FORMAT_FEHLER)
  if (anhang.groesse > MAX_FOTO_BYTES) throw new NutzerFehler("Das Foto ist grösser als 5 MB.")
  await pruefeObjekt(objektId)

  const admin = erstelleAdminClient()
  const { data: datei, error: ladefehler } = await admin.storage.from("mail-anhaenge").download(anhang.pfad)
  if (ladefehler) throw ladefehler
  // Die gespeicherte Grösse stammt aus dem Mail-Import; massgeblich ist die echte Datei.
  if (datei.size > MAX_FOTO_BYTES) throw new NutzerFehler("Das Foto ist grösser als 5 MB.")

  const pfad = neuerFotoPfad(objektId, randomUUID(), anhang.mime_type)
  const { error: hochladefehler } = await admin.storage
    .from(FOTO_BUCKET)
    .upload(pfad, datei, { contentType: anhang.mime_type })
  if (hochladefehler) throw hochladefehler
  // Frischer Pfad: auch bei einem (praktisch unmöglichen) Duplikat gehört die Datei zu keiner Zeile.
  const ergebnis = await fuegeFotoAn(objektId, pfad).catch(async (e: unknown) => {
    await entferneDatei(pfad)
    throw e
  })
  if (ergebnis === "duplikat") {
    await entferneDatei(pfad)
    throw new NutzerFehler(DUPLIKAT_MELDUNG)
  }
}
