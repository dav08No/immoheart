"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { holeEigenesProfil } from "@/lib/queries/profile"
import {
  aktualisiereNachricht,
  gibReservierungFrei,
  holeGesendeteIdsFuerAnfrage,
  holeNachricht,
  legeNachrichtAn,
  markiereGesendet,
  reserviereEntwurf,
} from "@/lib/queries/nachrichten"
import { aktualisiereAnfrage } from "@/lib/queries/anfragen"
import { entwurfSchema, type EntwurfEingabe } from "@/lib/entwurf-schema"
import { verlaufsKoepfe } from "@/lib/mail/verlauf"
import { escapeHtml } from "@/lib/mail/vorlagen"
import { sendeMail } from "@/lib/mail/versand"

const idSchema = z.uuid()

function pfadeNeuLaden() {
  revalidatePath("/admin/entwuerfe")
  revalidatePath("/admin/postfach")
  revalidatePath("/admin", "layout")
}

async function offenerEntwurf(id: string) {
  const entwurf = await holeNachricht(idSchema.parse(id))
  if (!entwurf || entwurf.richtung !== "entwurf" || entwurf.geloescht_am) throw new Error("Entwurf nicht gefunden")
  return entwurf
}

export async function entwurfSpeichern(id: string, eingabe: EntwurfEingabe): Promise<void> {
  await holeEigenesProfil()
  await offenerEntwurf(id)
  const geprueft = entwurfSchema.safeParse(eingabe)
  if (!geprueft.success) throw new Error("Bitte gültige Empfängeradresse, Betreff und Text angeben.")
  await aktualisiereNachricht(id, { ...geprueft.data, versand_fehler: null })
  pfadeNeuLaden()
}

export async function entwurfLoeschen(id: string): Promise<void> {
  await holeEigenesProfil()
  await offenerEntwurf(id)
  await aktualisiereNachricht(id, { geloescht_am: new Date().toISOString() })
  pfadeNeuLaden()
}

export async function neueMail(eingabe: EntwurfEingabe & { anfrageId?: string }): Promise<{ id: string }> {
  await holeEigenesProfil()
  const geprueft = entwurfSchema.safeParse(eingabe)
  if (!geprueft.success) throw new Error("Bitte gültige Empfängeradresse, Betreff und Text angeben.")
  const anfrageId = eingabe.anfrageId ? idSchema.parse(eingabe.anfrageId) : null
  const neu = await legeNachrichtAn({
    richtung: "entwurf",
    typ: "frei",
    anfrage_id: anfrageId,
    von: process.env.GMAIL_USER ?? "",
    ...geprueft.data,
  })
  pfadeNeuLaden()
  return { id: neu.id }
}

// Einziger Pfad, über den eine Kundenmail das System verlässt -- immer durch einen
// Klick ausgelöst. Reihenfolge: Entwurf prüfen -> atomar reservieren -> senden ->
// als gesendet markieren; bei SMTP-Fehler wird die Reservierung mit Fehlertext
// zurückgenommen, der Entwurf bleibt bestehen.
export async function entwurfSenden(id: string): Promise<void> {
  await holeEigenesProfil()
  const entwurf = await offenerEntwurf(id)
  const geprueft = entwurfSchema.safeParse({ an: entwurf.an, betreff: entwurf.betreff, body: entwurf.body })
  if (!geprueft.success) throw new Error("Empfängeradresse, Betreff oder Text ist ungültig. Bitte zuerst bearbeiten.")

  const reserviert = await reserviereEntwurf(id)
  if (!reserviert) throw new Error("Dieser Entwurf wird bereits gesendet oder wurde geändert.")

  const gesendet = entwurf.anfrage_id ? await holeGesendeteIdsFuerAnfrage(entwurf.anfrage_id) : []
  const beantwortet = entwurf.antwort_auf ? await holeNachricht(entwurf.antwort_auf) : null
  // Die beantwortete Eingangsmail ans Ende der bisherigen Kette anhängen und
  // Duplikate entfernen: dieselbe id koennte theoretisch schon in
  // holeGesendeteIdsFuerAnfrage stecken (falls antwort_auf zufaellig auf eine
  // Nachricht derselben Anfrage zeigt), verlaufsKoepfe soll sie nur einmal sehen.
  const bisherige = [...new Set([...gesendet, ...(beantwortet?.message_id ? [beantwortet.message_id] : [])])]
  const verlauf = verlaufsKoepfe(bisherige)
  const { betreff, body, an } = geprueft.data

  try {
    const { messageId } = await sendeMail(
      an,
      { betreff, text: body, html: `<div style="font-family:Arial,sans-serif;white-space:pre-wrap">${escapeHtml(body)}</div>` },
      verlauf
    )
    await markiereGesendet(id, {
      von: process.env.GMAIL_USER ?? "",
      message_id: messageId,
      in_reply_to: verlauf.inReplyTo,
      referenzen: verlauf.referenzen,
    })
  } catch (fehler) {
    console.error("entwurfSenden fehlgeschlagen", fehler)
    await gibReservierungFrei(id, "Versand fehlgeschlagen. Bitte später erneut versuchen.")
    pfadeNeuLaden()
    throw new Error("Versand fehlgeschlagen. Der Entwurf ist gespeichert.")
  }

  if (entwurf.anfrage_id) {
    await aktualisiereAnfrage(entwurf.anfrage_id, { letzter_kontakt: new Date().toISOString() })
    revalidatePath("/admin/anfragen")
  }
  pfadeNeuLaden()
}
