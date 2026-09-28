// Gemeinsame "eine Abruf-Runde"-Logik für PostfachKopf (manueller Button) und
// MailAbrufer (Hintergrund-Poller, Task 7): beide laufen potenziell in derselben
// Browser-Tab-Instanz und dürfen sich nie überlappen -- claimNaechsteOffene ist zwar
// serverseitig sicher, aber zwei parallele Runden würden trotzdem unnötig doppelte
// Server-Action-Aufrufe auslösen. abrufLaeuft ist bewusst modulweit (nicht je Komponente
// ein Ref): der Check-and-Set direkt zu Beginn läuft synchron vor dem ersten "await",
// JS ist single-threaded -- ein zweiter, "gleichzeitiger" Aufruf sieht das Flag also
// zuverlässig bereits gesetzt.
"use client"

import { mailAbrufen, verarbeiteNaechste } from "@/app/actions/eingang"
import { meldeNeueMails } from "@/lib/neue-mails-ereignis"

let abrufLaeuft = false

export type AbrufRundenErgebnis = {
  neu: number
  verarbeitet: number
  fehlgeschlagen: number
  abrufFehler: string | null
}

// Läuft bereits eine Runde (in dieser oder der jeweils anderen Komponente), liefert
// diese Funktion null statt zu warten oder eine zweite Runde zu starten.
export async function fuehreAbrufRundeAus(
  maxEinordnungen: number,
  beiFortschritt?: (verarbeitet: number) => void
): Promise<AbrufRundenErgebnis | null> {
  if (abrufLaeuft) return null
  abrufLaeuft = true
  try {
    const abruf = await mailAbrufen()
    // Ein Ereignis pro Runde mit neuer Post -- Sidebar (Herzschlag) und ggf. ein Toast
    // hören beide zu, unabhängig davon, welcher der beiden Aufrufer diese Runde gestartet hat.
    meldeNeueMails(abruf.neu)
    let verarbeitet = 0
    let fehlgeschlagen = 0
    for (let i = 0; i < maxEinordnungen; i++) {
      beiFortschritt?.(verarbeitet)
      const schritt = await verarbeiteNaechste()
      if (!schritt.verarbeitet) break
      verarbeitet += 1
      if (schritt.fehler) fehlgeschlagen += 1
    }
    return { neu: abruf.neu, verarbeitet, fehlgeschlagen, abrufFehler: abruf.fehler }
  } finally {
    abrufLaeuft = false
  }
}
