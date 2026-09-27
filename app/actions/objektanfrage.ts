"use server"

// Öffentliche Action ohne Login-Prüfung (für anonyme Website-Besucher) -- ihr Schutz
// besteht aus Honeypot, Mindestzeit, IP-Limit, zod und dem Auflösen des Objekts
// ausschliesslich über die öffentliche View (siehe Konstraint N5).
import { revalidatePath } from "next/cache"
import { headers } from "next/headers"
import { z } from "zod"
import { clientIp, erstelleZeitToken, hashIp, pruefeZeitToken, stundenFenster, LIMIT_PRO_STUNDE } from "@/lib/formular-schutz"
import { formularGeheimnis } from "@/lib/formular-geheimnis"
import { objektanfrageEntwurf, objektanfrageNachricht, objektanfrageSchema } from "@/lib/website-eintrag"
import { feldFehlerAus, limitErgebnis, zeitTokenErgebnis, type ObjektAnfrageErgebnis } from "@/lib/objektanfrage-ergebnis"
import { zaehleEinsendung } from "@/lib/queries/formular-limits"
import { holeOeffentlichesObjekt } from "@/lib/queries/oeffentlich"
import { erstelleAdminClient } from "@/lib/supabase/admin"

// Nachsichtig statt strikt: fehlt eines der Felder oder hat den falschen Typ (z.B. ein
// manipulierter Request), soll das wie ein leeres Honeypot-Feld bzw. ein ungültiges
// Zeit-Token behandelt werden, nicht wie ein technischer Fehler.
const formularSchema = z.object({
  webseite: z.string().catch(""),
  zeitToken: z.string().catch(""),
})

export async function zeitTokenHolen(): Promise<string> {
  return erstelleZeitToken(Date.now(), formularGeheimnis())
}

export async function objektAnfragen(eingabe: unknown): Promise<ObjektAnfrageErgebnis> {
  const kopf = formularSchema.safeParse(eingabe)
  const webseite = kopf.success ? kopf.data.webseite : ""
  const zeitToken = kopf.success ? kopf.data.zeitToken : ""

  // Honeypot: Bots füllen das versteckte Feld aus, echte Besucher lassen es leer.
  // Wir täuschen Erfolg vor, ohne etwas zu speichern -- ein Fehler würde dem Bot
  // verraten, dass er entdeckt wurde.
  if (webseite) return { ok: true }

  const geheimnis = formularGeheimnis()
  const tokenErgebnis = zeitTokenErgebnis(pruefeZeitToken(zeitToken, Date.now(), geheimnis))
  if (tokenErgebnis) return tokenErgebnis

  const geprueft = objektanfrageSchema.safeParse(eingabe)
  if (!geprueft.success) return { ok: false, fehler: "Bitte prüfen Sie Ihre Eingaben.", feldFehler: feldFehlerAus(geprueft.error) }

  const kopfzeilen = await headers()
  const ipHash = hashIp(clientIp(kopfzeilen), geheimnis)
  const anzahl = await zaehleEinsendung(ipHash, stundenFenster(Date.now()))
  const limitTreffer = limitErgebnis(anzahl, LIMIT_PRO_STUNDE)
  if (limitTreffer) return limitTreffer

  // Nur über die öffentliche View aufgelöst -- ein unveröffentlichtes/verstecktes
  // Objekt darf über eine erratene ID nicht anfragbar sein.
  const objekt = await holeOeffentlichesObjekt(geprueft.data.objektId)
  if (!objekt) return { ok: false, fehler: "Dieses Objekt ist nicht mehr verfügbar." }

  const admin = erstelleAdminClient()
  const an = process.env.GMAIL_USER ?? ""
  const { data: nachricht, error } = await admin
    .from("nachrichten")
    .insert(objektanfrageNachricht(geprueft.data, objekt.titel, an))
    .select("id")
    .single()
  if (error) throw error

  const entwurf = objektanfrageEntwurf(geprueft.data, objekt.titel)
  const { error: entwurfFehler } = await admin.from("nachrichten").insert({
    richtung: "entwurf",
    typ: "antwort",
    kategorie: "objektanfrage",
    quelle: "website",
    an: geprueft.data.email,
    von: an,
    betreff: entwurf.betreff,
    body: entwurf.body,
    antwort_auf: nachricht.id,
    objekt_id: geprueft.data.objektId,
  })
  // Der Eingang ist wichtiger als der Entwurf -- ein fehlgeschlagener Entwurf darf die
  // bereits gespeicherte Anfrage nicht verwerfen (Task-3-Vorgabe).
  if (entwurfFehler) console.error("objektAnfragen: Entwurf fehlgeschlagen", entwurfFehler)

  revalidatePath("/admin/postfach")
  revalidatePath("/admin", "layout")
  return { ok: true }
}
