"use server"

import { revalidatePath } from "next/cache"
import { headers } from "next/headers"
import { z } from "zod"
import { erstelleAdminClient } from "@/lib/supabase/admin"
import { holeBerechtigtesProfil } from "@/lib/queries/profile"
import { zaehleAktiveMitRecht } from "@/lib/queries/nutzer"
import { deaktivierenVerboten, neuesKontoSchema, rechtEntzugVerboten } from "@/lib/nutzer-regeln"
import { einladungsMail } from "@/lib/mail/vorlagen"
import { sendeMail } from "@/lib/mail/versand"
import { basisUrl, bestaetigungsLink } from "@/lib/basis-url"

const userIdSchema = z.uuid()
const DAUERHAFT_GESPERRT = "876000h"

async function linkBasis(): Promise<string> {
  const kopf = await headers()
  return basisUrl(kopf.get("x-forwarded-host") ?? kopf.get("host"), kopf.get("x-forwarded-proto"))
}

async function holeZielprofil(userId: string) {
  const admin = erstelleAdminClient()
  const { data, error } = await admin.from("profiles").select("*").eq("user_id", userId).maybeSingle()
  if (error) throw error
  if (!data) throw new Error("Konto nicht gefunden")
  return data
}

export async function kontoAnlegen(eingabe: {
  name: string
  email: string
  darfNutzerAnlegen: boolean
}): Promise<{ hinweis: string | null }> {
  await holeBerechtigtesProfil()
  const geprueft = neuesKontoSchema.safeParse(eingabe)
  if (!geprueft.success) throw new Error("Bitte Name und gültige E-Mail angeben.")
  const { name, email, darfNutzerAnlegen } = geprueft.data

  const admin = erstelleAdminClient()
  const { data, error } = await admin.auth.admin.generateLink({ type: "invite", email, options: { data: { name } } })
  if (error || !data.user) throw new Error("Zu dieser E-Mail besteht bereits ein Konto oder sie ist ungültig.")

  const { error: profilFehler } = await admin
    .from("profiles")
    .insert({ user_id: data.user.id, name, aktiv: true, darf_nutzer_anlegen: darfNutzerAnlegen })
  if (profilFehler) {
    // Ohne Profil wäre das Konto unbrauchbar und die E-Mail blockiert -- zurückrollen.
    await admin.auth.admin.deleteUser(data.user.id)
    throw new Error("Konto konnte nicht angelegt werden.")
  }

  revalidatePath("/admin/nutzer")
  try {
    await sendeMail(email, einladungsMail(name, bestaetigungsLink(await linkBasis(), data.properties.hashed_token, "invite")))
    return { hinweis: null }
  } catch (fehler) {
    console.error("kontoAnlegen: Einladung nicht gesendet", fehler)
    return { hinweis: "Konto angelegt, aber die Einladung konnte nicht gesendet werden. Bitte „Einladung erneut senden“." }
  }
}

export async function setzeNutzerRecht(userId: string, wert: boolean): Promise<void> {
  const selbst = await holeBerechtigtesProfil()
  const id = userIdSchema.parse(userId)
  const ziel = await holeZielprofil(id)
  if (!wert) {
    const verbot = rechtEntzugVerboten({
      zielUserId: id,
      eigeneUserId: selbst.user_id,
      aktiveMitRecht: await zaehleAktiveMitRecht(),
      zielIstAktiv: ziel.aktiv,
    })
    if (verbot) throw new Error(verbot)
  }
  const { error } = await erstelleAdminClient().from("profiles").update({ darf_nutzer_anlegen: wert }).eq("user_id", id)
  if (error) throw error
  revalidatePath("/admin/nutzer")
}

export async function kontoDeaktivieren(userId: string): Promise<void> {
  const selbst = await holeBerechtigtesProfil()
  const id = userIdSchema.parse(userId)
  const ziel = await holeZielprofil(id)
  const verbot = deaktivierenVerboten({
    zielUserId: id,
    eigeneUserId: selbst.user_id,
    zielHatRecht: ziel.darf_nutzer_anlegen && ziel.aktiv,
    aktiveMitRecht: await zaehleAktiveMitRecht(),
  })
  if (verbot) throw new Error(verbot)

  const admin = erstelleAdminClient()
  const { error } = await admin.from("profiles").update({ aktiv: false }).eq("user_id", id)
  if (error) throw error
  // Sperre auf Auth-Ebene zusätzlich zu aktiv=false: verhindert neue Anmeldungen
  // und Token-Erneuerung, nicht nur den Zugriff auf /admin.
  const { error: sperrFehler } = await admin.auth.admin.updateUserById(id, { ban_duration: DAUERHAFT_GESPERRT })
  if (sperrFehler) throw sperrFehler
  revalidatePath("/admin/nutzer")
}

export async function kontoReaktivieren(userId: string): Promise<void> {
  await holeBerechtigtesProfil()
  const id = userIdSchema.parse(userId)
  await holeZielprofil(id)
  const admin = erstelleAdminClient()
  const { error: sperrFehler } = await admin.auth.admin.updateUserById(id, { ban_duration: "none" })
  if (sperrFehler) throw sperrFehler
  const { error } = await admin.from("profiles").update({ aktiv: true }).eq("user_id", id)
  if (error) throw error
  revalidatePath("/admin/nutzer")
}

export async function einladungErneutSenden(userId: string): Promise<void> {
  await holeBerechtigtesProfil()
  const id = userIdSchema.parse(userId)
  const ziel = await holeZielprofil(id)
  if (!ziel.aktiv) throw new Error("Deaktivierte Konten erhalten keine Einladung.")

  const admin = erstelleAdminClient()
  const { data: nutzer, error: nutzerFehler } = await admin.auth.admin.getUserById(id)
  if (nutzerFehler || !nutzer.user.email) throw new Error("Konto nicht gefunden")
  // recovery statt invite: funktioniert auch für bereits bestehende Auth-Nutzer
  // und führt über denselben Weg zu /passwort-setzen.
  const { data, error } = await admin.auth.admin.generateLink({ type: "recovery", email: nutzer.user.email })
  if (error) throw error
  await sendeMail(
    nutzer.user.email,
    einladungsMail(ziel.name, bestaetigungsLink(await linkBasis(), data.properties.hashed_token, "recovery"))
  )
}
