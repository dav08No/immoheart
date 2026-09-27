"use server"

import { after } from "next/server"
import { headers } from "next/headers"
import { z } from "zod"
import { erstelleAdminClient } from "@/lib/supabase/admin"
import { passwortResetMail } from "@/lib/mail/vorlagen"
import { sendeMail } from "@/lib/mail/versand"
import { basisUrl, bestaetigungsLink } from "@/lib/basis-url"
import { clientIp, hashIp, stundenFenster, LIMIT_PRO_STUNDE } from "@/lib/formular-schutz"
import { formularGeheimnis } from "@/lib/formular-geheimnis"
import { zaehleEinsendung } from "@/lib/queries/formular-limits"

const eingabe = z.object({ email: z.email().max(254) })

// Gibt bewusst nie preis, ob ein Konto existiert: gleiche Rückkehr (kein Fehler)
// bei unbekannter, deaktivierter oder ungültiger Adresse. Damit auch die
// Antwortzeit nichts verrät (Profil-Lookup + SMTP-Versand dauern länger als ein
// sofortiger Abbruch), läuft ab hier alles in after(): die Funktion selbst
// kehrt für jede Eingabe gleich schnell zurück, der eigentliche Versand
// passiert erst, nachdem die Antwort schon beim Client ist. headers() wird
// vorher gelesen, weil Request-APIs innerhalb von after() nicht sicher
// verfügbar sind. Nur aktive Konten bekommen eine Mail; Fehler beim Versand
// werden geloggt, nicht gemeldet.
export async function passwortVergessen(email: string): Promise<void> {
  const geprueft = eingabe.safeParse({ email: email.trim().toLowerCase() })
  if (!geprueft.success) return

  const kopf = await headers()
  const basis = basisUrl(kopf.get("x-forwarded-host") ?? kopf.get("host"), kopf.get("x-forwarded-proto"))

  // Gleiches Limit wie die Objektanfrage, eigener Hash-Kontext ("pw:"-Präfix): ohne
  // dieses Limit könnte ein Angreifer beliebig viele generateLink-Aufrufe (und damit
  // Mail-Versände) über dasselbe Formular auslösen. Läuft vor after() und damit noch
  // synchron in der Antwortzeit -- das verrät nichts über die E-Mail, da die Dauer nur
  // von der IP abhängt, nicht davon, ob das Konto existiert.
  const ipHash = hashIp(`pw:${clientIp(kopf)}`, formularGeheimnis())
  const anzahl = await zaehleEinsendung(ipHash, stundenFenster(Date.now()))
  if (anzahl > LIMIT_PRO_STUNDE) return

  after(async () => {
    try {
      const admin = erstelleAdminClient()
      const { data, error } = await admin.auth.admin.generateLink({ type: "recovery", email: geprueft.data.email })
      if (error || !data.user) return

      const { data: profil } = await admin.from("profiles").select("aktiv").eq("user_id", data.user.id).maybeSingle()
      if (!profil?.aktiv) return

      const link = bestaetigungsLink(basis, data.properties.hashed_token, "recovery")
      await sendeMail(geprueft.data.email, passwortResetMail(link))
    } catch (fehler) {
      console.error("passwortVergessen: Versand fehlgeschlagen", fehler)
    }
  })
}
