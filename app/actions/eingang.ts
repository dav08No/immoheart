"use server"

import { holeEigenesProfil } from "@/lib/queries/profile"
import { holeNeueMails } from "@/lib/mail/abruf"
import { abrufErfolg, abrufFehler, sperreAbruf } from "@/lib/queries/eingang"
import { pfadeNeuLaden } from "@/app/actions/entwuerfe-hilfen"

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
