"use server"

import { z } from "zod"
import { holeEigenesProfil } from "@/lib/queries/profile"
import { holeNeueMails } from "@/lib/mail/abruf"
import { abrufErfolg, abrufFehler, sperreAbruf } from "@/lib/queries/eingang"
import { claimNachricht, claimNaechsteOffene } from "@/lib/queries/verarbeitung"
import { aktualisiereNachricht, holeNachricht } from "@/lib/queries/nachrichten"
import { verarbeite } from "@/lib/eingang/verarbeitung"
import { NutzerFehler } from "@/lib/nutzer-fehler"
import { idSchema, pfadeNeuLaden, type Ergebnis } from "@/app/actions/entwuerfe-hilfen"

const MAX_MAILS_PRO_ABRUF = 5

// sperreAbruf() statt einer Warteschlange: ein bereits laufender oder erst vor kurzem
// beendeter Abruf (60 s, siehe lib/queries/eingang.ts) liefert bewusst { neu: 0, fehler:
// null } zurück -- kein Fehler, nur "gerade nichts zu tun" --, damit ein zweiter, fast
// gleichzeitiger Klick oder ein Auto-Refresh keinen doppelten IMAP-Abruf auslöst.
export async function mailAbrufen(): Promise<{ neu: number; fehler: string | null }> {
  await holeEigenesProfil()
  if (!(await sperreAbruf())) return { neu: 0, fehler: null }

  try {
    const { gespeichert } = await holeNeueMails(MAX_MAILS_PRO_ABRUF)
    await abrufErfolg()
    pfadeNeuLaden()
    return { neu: gespeichert, fehler: null }
  } catch (fehler) {
    // Unerwarteter Fehler (IMAP-Verbindung, Storage-Upload, DB) -- Kurztext für die
    // Postfach-Statusanzeige speichern, der Nutzerin aber keinen Stacktrace zeigen.
    console.error("mailAbrufen fehlgeschlagen", fehler)
    await abrufFehler(fehler instanceof Error ? fehler.message : "Unbekannter Fehler beim Mail-Abruf")
    return { neu: 0, fehler: "Abruf fehlgeschlagen. Details im Postfach." }
  }
}

const kategorieSchema = z.enum(["suchanfrage", "antwort", "objektangebot", "sonstiges"])

async function kiFehlerVon(id: string): Promise<string | null> {
  const nachher = await holeNachricht(id)
  return nachher?.ki_status === "fehler" ? (nachher.ki_fehler ?? "Verarbeitung fehlgeschlagen.") : null
}

// Eine Mail pro Aufruf: ordneEin plus höchstens ein Entwurf passt in das 60-s-Budget
// einer Server Action; der Client ruft so lange nach, bis verarbeitet false ist.
export async function verarbeiteNaechste(): Promise<{ verarbeitet: boolean; fehler: string | null }> {
  await holeEigenesProfil()
  const nachricht = await claimNaechsteOffene()
  if (!nachricht) return { verarbeitet: false, fehler: null }
  await verarbeite(nachricht)
  pfadeNeuLaden()
  return { verarbeitet: true, fehler: await kiFehlerVon(nachricht.id) }
}

// Bestehende Entwürfe bleiben stehen; verarbeite legt keinen zweiten an.
export async function erneutVerarbeiten(id: string): Promise<Ergebnis> {
  await holeEigenesProfil()
  try {
    const nachricht = await claimNachricht(idSchema.parse(id), "abgeschlossen")
    if (!nachricht) throw new NutzerFehler("Wird gerade verarbeitet")
    await verarbeite(nachricht)
    pfadeNeuLaden()
    return { fehler: await kiFehlerVon(nachricht.id) }
  } catch (e) {
    if (e instanceof NutzerFehler) return { fehler: e.message }
    throw e
  }
}

export async function kategorieAendern(id: string, kategorie: string): Promise<Ergebnis> {
  await holeEigenesProfil()
  try {
    const geprueft = kategorieSchema.safeParse(kategorie)
    if (!geprueft.success) throw new NutzerFehler("Unbekannte Kategorie")
    const nachricht = await claimNachricht(idSchema.parse(id), "nicht_laufend")
    if (!nachricht) throw new NutzerFehler("Wird gerade verarbeitet")
    // Vorab speichern, damit die Wahl der Nutzerin auch bei einem KI-Fehler sichtbar bleibt.
    await aktualisiereNachricht(nachricht.id, { kategorie: geprueft.data })
    await verarbeite({ ...nachricht, kategorie: geprueft.data }, geprueft.data)
    pfadeNeuLaden()
    return { fehler: await kiFehlerVon(nachricht.id) }
  } catch (e) {
    if (e instanceof NutzerFehler) return { fehler: e.message }
    throw e
  }
}
