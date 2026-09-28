// Gemeinsamer Ablauf aller öffentlichen Formulare ("Objekt anfragen", "Suchauftrag"),
// damit beide garantiert dieselbe Schutz-Reihenfolge haben:
// Honeypot → Zeit-Token → zod → IP-Limit → vorbereiten() → Eingang + Entwurf → revalidate.
// Keine Login-Prüfung (anonyme Besucher); kein Versand -- nur Eingang + Entwurf.
import "server-only"
import { revalidatePath } from "next/cache"
import { headers } from "next/headers"
import { z } from "zod"
import { clientIp, hashIp, pruefeZeitToken, stundenFenster, LIMIT_PRO_STUNDE } from "@/lib/formular-schutz"
import { formularGeheimnis } from "@/lib/formular-geheimnis"
import { limitErgebnis, zeitTokenErgebnis, zodFehlerErgebnis, type FormularErgebnis } from "@/lib/formular-ergebnis"
import { zaehleEinsendung } from "@/lib/queries/formular-limits"
import { erstelleAdminClient } from "@/lib/supabase/admin"
import type { NachrichtEinfuegen } from "@/lib/website-eintrag"

// Nachsichtig statt strikt: fehlt eines der Felder oder hat den falschen Typ (z.B. ein
// manipulierter Request), soll das wie ein leeres Honeypot-Feld bzw. ein ungültiges
// Zeit-Token behandelt werden, nicht wie ein technischer Fehler.
const formularSchema = z.object({
  webseite: z.string().catch(""),
  zeitToken: z.string().catch(""),
})

// Ergebnis von vorbereiten(): entweder Kontext für die Textbausteine (z.B. das
// aufgelöste Objekt) oder eine fertige Antwort für das Formular (z.B. "nicht verfügbar").
export type Vorbereitung<K> = { ok: true; kontext: K } | { ok: false; ergebnis: FormularErgebnis }

// Entwurf ohne antwort_auf/Richtung/Typ -- die setzt der Ablauf selbst einheitlich.
export type EntwurfFelder = Omit<NachrichtEinfuegen, "richtung" | "typ" | "antwort_auf">

type WebsiteEintrag<T, K> = {
  eingabe: unknown
  schema: z.ZodType<T>
  // Name für die Server-Logs, z.B. "objektAnfragen".
  protokoll: string
  vorbereiten: (daten: T) => Promise<Vorbereitung<K>>
  baueEingang: (daten: T, kontext: K, an: string) => NachrichtEinfuegen
  baueEntwurf: (daten: T, kontext: K, an: string) => EntwurfFelder
}

const GENERISCHER_FEHLER = "Ihre Anfrage konnte gerade nicht gespeichert werden. Bitte versuchen Sie es später erneut."

export async function speichereWebsiteEintrag<T, K>(auftrag: WebsiteEintrag<T, K>): Promise<FormularErgebnis> {
  const kopf = formularSchema.safeParse(auftrag.eingabe)
  const webseite = kopf.success ? kopf.data.webseite : ""
  const zeitToken = kopf.success ? kopf.data.zeitToken : ""

  // Honeypot: Bots füllen das versteckte Feld aus, echte Besucher lassen es leer.
  // Wir täuschen Erfolg vor, ohne etwas zu speichern -- ein Fehler würde dem Bot
  // verraten, dass er entdeckt wurde.
  if (webseite) return { ok: true }

  // Alles ab hier kann werfen (formularGeheimnis fehlt Schlüssel, RPC/DB-Fehler,
  // fehlendes GMAIL_USER) -- ein technischer Fehler soll der Besucherin nie als
  // Server-Fehlerseite erscheinen, sondern als normale, freundliche Formularmeldung.
  try {
    const geheimnis = formularGeheimnis()
    const tokenErgebnis = zeitTokenErgebnis(pruefeZeitToken(zeitToken, Date.now(), geheimnis))
    if (tokenErgebnis) return tokenErgebnis

    const geprueft = auftrag.schema.safeParse(auftrag.eingabe)
    if (!geprueft.success) return zodFehlerErgebnis(geprueft.error)

    const kopfzeilen = await headers()
    const ipHash = hashIp(clientIp(kopfzeilen), geheimnis)
    const anzahl = await zaehleEinsendung(ipHash, stundenFenster(Date.now()))
    const limitTreffer = limitErgebnis(anzahl, LIMIT_PRO_STUNDE)
    if (limitTreffer) return limitTreffer

    const vorbereitung = await auftrag.vorbereiten(geprueft.data)
    if (!vorbereitung.ok) return vorbereitung.ergebnis

    const an = process.env.GMAIL_USER
    if (!an) throw new Error("GMAIL_USER fehlt")

    const admin = erstelleAdminClient()
    const { data: nachricht, error } = await admin
      .from("nachrichten")
      .insert(auftrag.baueEingang(geprueft.data, vorbereitung.kontext, an))
      .select("id")
      .single()
    if (error) throw error

    const { error: entwurfFehler } = await admin.from("nachrichten").insert({
      ...auftrag.baueEntwurf(geprueft.data, vorbereitung.kontext, an),
      richtung: "entwurf",
      typ: "antwort",
      antwort_auf: nachricht.id,
    })
    // Der Eingang ist wichtiger als der Entwurf -- ein fehlgeschlagener Entwurf darf die
    // bereits gespeicherte Anfrage nicht verwerfen.
    if (entwurfFehler) console.error(`${auftrag.protokoll}: Entwurf fehlgeschlagen`, entwurfFehler)

    revalidatePath("/admin/postfach")
    revalidatePath("/admin", "layout")
    return { ok: true }
  } catch (fehler) {
    console.error(`${auftrag.protokoll}: fehlgeschlagen`, fehler)
    return { ok: false, fehler: GENERISCHER_FEHLER }
  }
}

// Für Formulare ohne Vorab-Prüfung (z.B. Suchauftrag).
export async function ohneVorbereitung(): Promise<Vorbereitung<null>> {
  return { ok: true, kontext: null }
}
