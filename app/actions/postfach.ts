"use server"

import { holeEigenesProfil } from "@/lib/queries/profile"
import { holeNachricht, legeNachrichtAn } from "@/lib/queries/nachrichten"
import { holeAnhangLinks, type AnhangLink } from "@/lib/queries/postfach"
import { antwortBetreff } from "@/lib/mail/verlauf"
import { NutzerFehler } from "@/lib/nutzer-fehler"
import { idSchema, pfadeNeuLaden } from "@/app/actions/entwuerfe-hilfen"

// Ohne KI: ein leerer Antwort-Entwurf mit "Re:" und Verlauf-Bezug (antwort_auf), den die
// Nutzerin im Editor selbst schreibt. typ "antwort" statt "frei", damit er in der
// Entwürfe-Liste unter "Antworten" neben den KI-Antworten steht; gesendet wird wie immer
// nur aus dem Editor.
export async function antwortEntwerfen(nachrichtId: string): Promise<{ fehler: string | null; entwurfId: string | null }> {
  await holeEigenesProfil()
  try {
    const eingang = await holeNachricht(idSchema.parse(nachrichtId))
    if (!eingang || eingang.richtung !== "eingang" || eingang.geloescht_am) {
      throw new NutzerFehler("Nachricht nicht gefunden.")
    }
    if (!eingang.von.includes("@")) throw new NutzerFehler("Absender hat keine gültige Mailadresse.")
    const entwurf = await legeNachrichtAn({
      richtung: "entwurf",
      typ: "antwort",
      anfrage_id: eingang.anfrage_id,
      antwort_auf: eingang.id,
      von: process.env.GMAIL_USER ?? "",
      an: eingang.von,
      betreff: antwortBetreff(eingang.betreff),
      body: "",
    })
    pfadeNeuLaden()
    return { fehler: null, entwurfId: entwurf.id }
  } catch (e) {
    if (e instanceof NutzerFehler) return { fehler: e.message, entwurfId: null }
    throw e
  }
}

// Signierte URLs (10 Min.) erst nach Login-Prüfung -- der Bucket selbst ist privat.
export async function anhangLinks(nachrichtId: string): Promise<{ fehler: string | null; links: AnhangLink[] }> {
  await holeEigenesProfil()
  const geprueft = idSchema.safeParse(nachrichtId)
  if (!geprueft.success) return { fehler: "Nachricht nicht gefunden.", links: [] }
  // Gleiche Regel wie antwortEntwerfen: gelöschte Nachrichten geben nichts mehr heraus.
  const nachricht = await holeNachricht(geprueft.data)
  if (!nachricht || nachricht.geloescht_am) return { fehler: "Nachricht nicht gefunden.", links: [] }
  return { fehler: null, links: await holeAnhangLinks(nachricht.id) }
}
