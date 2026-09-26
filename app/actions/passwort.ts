"use server"

import { headers } from "next/headers"
import { z } from "zod"
import { erstelleAdminClient } from "@/lib/supabase/admin"
import { passwortResetMail } from "@/lib/mail/vorlagen"
import { sendeMail } from "@/lib/mail/versand"
import { basisUrl, bestaetigungsLink } from "@/lib/basis-url"

const eingabe = z.object({ email: z.email().max(254) })

// Gibt bewusst nie preis, ob ein Konto existiert: gleiche Rückkehr (kein Fehler)
// bei unbekannter, deaktivierter oder ungültiger Adresse. Nur aktive Konten
// bekommen eine Mail; Fehler beim Versand werden geloggt, nicht gemeldet.
export async function passwortVergessen(email: string): Promise<void> {
  const geprueft = eingabe.safeParse({ email: email.trim().toLowerCase() })
  if (!geprueft.success) return

  const admin = erstelleAdminClient()
  const { data, error } = await admin.auth.admin.generateLink({ type: "recovery", email: geprueft.data.email })
  if (error || !data.user) return

  const { data: profil } = await admin.from("profiles").select("aktiv").eq("user_id", data.user.id).maybeSingle()
  if (!profil?.aktiv) return

  const kopf = await headers()
  const link = bestaetigungsLink(
    basisUrl(kopf.get("x-forwarded-host") ?? kopf.get("host"), kopf.get("x-forwarded-proto")),
    data.properties.hashed_token,
    "recovery"
  )
  try {
    await sendeMail(geprueft.data.email, passwortResetMail(link))
  } catch (fehler) {
    console.error("passwortVergessen: Versand fehlgeschlagen", fehler)
  }
}
