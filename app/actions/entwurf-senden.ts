"use server"

import { revalidatePath } from "next/cache"
import { holeEigenesProfil } from "@/lib/queries/profile"
import { aktualisiereNachricht, holeNachricht } from "@/lib/queries/nachrichten"
import { gibReservierungFrei, holeGesendeteIdsFuerAnfrage, markiereGesendet, reserviereEntwurf } from "@/lib/queries/versand"
import { aktualisiereAnfrage } from "@/lib/queries/anfragen"
import { entwurfSchema } from "@/lib/entwurf-schema"
import { NutzerFehler } from "@/lib/nutzer-fehler"
import { verlaufsKoepfe } from "@/lib/mail/verlauf"
import { escapeHtml } from "@/lib/mail/vorlagen"
import { sendeMail } from "@/lib/mail/versand"
import { offenerEntwurf, pfadeNeuLaden, type Ergebnis } from "@/app/actions/entwuerfe-hilfen"

// Einziger Pfad, über den eine Kundenmail das System verlässt -- immer durch einen
// Klick ausgelöst. Reihenfolge: Entwurf prüfen -> Verlauf lesen -> atomar
// reservieren -> senden -> als gesendet markieren. Die lesenden Schritte
// (Verlauf) stehen bewusst VOR reserviereEntwurf: schlägt einer von ihnen fehl,
// bleibt der Entwurf unreserviert und ganz normal erneut sendbar, statt dass
// ein reiner Lesefehler bereits einen "wird gesendet"-Zustand hinterlässt, der
// erst durch gibReservierungFrei wieder aufgeräumt werden müsste.
export async function entwurfSenden(id: string): Promise<Ergebnis> {
  await holeEigenesProfil()
  try {
    const entwurf = await offenerEntwurf(id)

    const gesendet = entwurf.anfrage_id ? await holeGesendeteIdsFuerAnfrage(entwurf.anfrage_id) : []
    const beantwortet = entwurf.antwort_auf ? await holeNachricht(entwurf.antwort_auf) : null
    // Die beantwortete Eingangsmail ans Ende der bisherigen Kette anhängen und
    // Duplikate entfernen: dieselbe id koennte theoretisch schon in
    // holeGesendeteIdsFuerAnfrage stecken (falls antwort_auf zufaellig auf eine
    // Nachricht derselben Anfrage zeigt), verlaufsKoepfe soll sie nur einmal sehen.
    const bisherige = [...new Set([...gesendet, ...(beantwortet?.message_id ? [beantwortet.message_id] : [])])]
    const verlauf = verlaufsKoepfe(bisherige)

    const reserviert = await reserviereEntwurf(id)
    if (!reserviert) throw new NutzerFehler("Dieser Entwurf wird bereits gesendet oder wurde geändert.")

    // Re-Parse aus der von reserviereEntwurf zurückgegebenen Zeile statt aus dem
    // Vor-Reservierungs-Lesen oben (N3-Review, Fund 6): reserviereEntwurf liefert den
    // zum Reservierungszeitpunkt tatsächlich committeten Stand -- ein Speichern, das
    // zwischen dem Lesen oben und der Reservierung lief, darf nicht mit veralteten
    // Werten verschickt werden.
    const geprueft = entwurfSchema.safeParse({ an: reserviert.an, betreff: reserviert.betreff, body: reserviert.body })
    if (!geprueft.success) {
      const hinweis = "Empfängeradresse, Betreff oder Text ist ungültig. Bitte zuerst bearbeiten."
      await gibReservierungFrei(id, hinweis)
      pfadeNeuLaden()
      return { fehler: hinweis }
    }
    const { betreff, body, an } = geprueft.data

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
      return { fehler: "Versand fehlgeschlagen. Der Entwurf ist gespeichert." }
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
        gesendet_am: new Date().toISOString(),
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
      return { fehler: "Die Mail wurde gesendet, der Status konnte aber nicht gespeichert werden. Bitte nicht erneut senden." }
    }

    // Best-effort: die Mail ist an diesem Punkt bereits erfolgreich versendet UND
    // als "gesendet" markiert. Ein Fehler beim reinen Komfort-Feld letzter_kontakt
    // darf der Nutzerin nicht als Versandfehler angezeigt werden -- sie hat sonst
    // keinen Weg zu erkennen, dass die Mail trotzdem rausgegangen ist.
    if (entwurf.anfrage_id) {
      try {
        await aktualisiereAnfrage(entwurf.anfrage_id, { letzter_kontakt: new Date().toISOString() })
        revalidatePath("/admin/anfragen")
      } catch (fehler) {
        console.error("aktualisiereAnfrage fehlgeschlagen nach erfolgreichem Versand", fehler)
      }
    }
    pfadeNeuLaden()
    return { fehler: null }
  } catch (e) {
    if (e instanceof NutzerFehler) return { fehler: e.message }
    throw e
  }
}
