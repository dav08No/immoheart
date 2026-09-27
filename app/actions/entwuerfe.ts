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

// Lehnt zusätzlich zu bereits gelöschten auch gerade reservierte (gesendet_am
// gesetzt, aber richtung noch "entwurf") Entwürfe ab: entwurfSpeichern/
// entwurfLoeschen dürfen einen Entwurf, der sich mitten im Versand befindet
// (siehe reserviereEntwurf), nicht mehr unter dem laufenden Versand verändern
// oder löschen -- das würde z.B. den Text nach dem SMTP-Versand, aber vor dem
// markiereGesendet-Update überschreiben.
async function offenerEntwurf(id: string) {
  const entwurf = await holeNachricht(idSchema.parse(id))
  if (!entwurf || entwurf.richtung !== "entwurf" || entwurf.geloescht_am) throw new Error("Entwurf nicht gefunden")
  if (entwurf.gesendet_am) throw new Error("Dieser Entwurf wird gerade gesendet.")
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
// Klick ausgelöst. Reihenfolge: Entwurf prüfen -> Verlauf lesen -> atomar
// reservieren -> senden -> als gesendet markieren. Die lesenden Schritte
// (Verlauf) stehen bewusst VOR reserviereEntwurf: schlägt einer von ihnen fehl,
// bleibt der Entwurf unreserviert und ganz normal erneut sendbar, statt dass
// ein reiner Lesefehler bereits einen "wird gesendet"-Zustand hinterlässt, der
// erst durch gibReservierungFrei wieder aufgeräumt werden müsste.
export async function entwurfSenden(id: string): Promise<void> {
  await holeEigenesProfil()
  const entwurf = await offenerEntwurf(id)
  const geprueft = entwurfSchema.safeParse({ an: entwurf.an, betreff: entwurf.betreff, body: entwurf.body })
  if (!geprueft.success) throw new Error("Empfängeradresse, Betreff oder Text ist ungültig. Bitte zuerst bearbeiten.")

  const gesendet = entwurf.anfrage_id ? await holeGesendeteIdsFuerAnfrage(entwurf.anfrage_id) : []
  const beantwortet = entwurf.antwort_auf ? await holeNachricht(entwurf.antwort_auf) : null
  // Die beantwortete Eingangsmail ans Ende der bisherigen Kette anhängen und
  // Duplikate entfernen: dieselbe id koennte theoretisch schon in
  // holeGesendeteIdsFuerAnfrage stecken (falls antwort_auf zufaellig auf eine
  // Nachricht derselben Anfrage zeigt), verlaufsKoepfe soll sie nur einmal sehen.
  const bisherige = [...new Set([...gesendet, ...(beantwortet?.message_id ? [beantwortet.message_id] : [])])]
  const verlauf = verlaufsKoepfe(bisherige)
  const { betreff, body, an } = geprueft.data

  const reserviert = await reserviereEntwurf(id)
  if (!reserviert) throw new Error("Dieser Entwurf wird bereits gesendet oder wurde geändert.")

  let messageId: string
  try {
    const versandt = await sendeMail(
      an,
      { betreff, text: body, html: `<div style="font-family:Arial,sans-serif;white-space:pre-wrap">${escapeHtml(body)}</div>` },
      verlauf
    )
    messageId = versandt.messageId
  } catch (fehler) {
    console.error("entwurfSenden fehlgeschlagen", fehler)
    await gibReservierungFrei(id, "Versand fehlgeschlagen. Bitte später erneut versuchen.")
    pfadeNeuLaden()
    throw new Error("Versand fehlgeschlagen. Der Entwurf ist gespeichert.")
  }

  // Ab hier hat die Mail den SMTP-Server bereits verlassen -- ein Fehler beim
  // Speichern des Status darf NIE dazu führen, dass die Reservierung wieder
  // freigegeben wird (das würde einen zweiten Klick erlauben und die Mail ein
  // zweites Mal verschicken). gesendet_am bleibt gesetzt, reserviereEntwurf
  // lehnt einen erneuten Versand damit weiterhin ab; versand_fehler wird nur
  // noch best-effort für die Anzeige im Postfach gesetzt.
  try {
    await markiereGesendet(id, {
      von: process.env.GMAIL_USER ?? "",
      message_id: messageId,
      in_reply_to: verlauf.inReplyTo,
      referenzen: verlauf.referenzen,
    })
  } catch (fehler) {
    console.error("markiereGesendet fehlgeschlagen nach erfolgreichem Versand", messageId, fehler)
    try {
      await aktualisiereNachricht(id, {
        versand_fehler: "Mail wurde gesendet, Status konnte nicht gespeichert werden. Nicht erneut senden.",
      })
    } catch (schreibFehler) {
      console.error("versand_fehler-Hinweis konnte nicht gespeichert werden", schreibFehler)
    }
    pfadeNeuLaden()
    throw new Error("Die Mail wurde gesendet, der Status konnte aber nicht gespeichert werden. Bitte nicht erneut senden.")
  }

  if (entwurf.anfrage_id) {
    await aktualisiereAnfrage(entwurf.anfrage_id, { letzter_kontakt: new Date().toISOString() })
    revalidatePath("/admin/anfragen")
  }
  pfadeNeuLaden()
}
