"use client"

import { useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { fuehreAbrufRundeAus } from "@/lib/postfach-abruf"
import { sollJetztAbrufen } from "@/lib/mail-abruf-timing"

const INTERVALL_MS = 120_000
// Kleiner als PostfachKopfs manuelle Obergrenze (10): läuft unbeaufsichtigt im
// Hintergrund, ohne Fortschrittsanzeige -- eine Runde soll nicht minutenlang laufen,
// bevor der nächste Sichtbarkeits-/Intervall-Trigger eine weitere anstösst.
const MAX_EINORDNUNGEN = 5

// Rendert nichts; hält nur den Hintergrund-Poller am Laufen, solange der Admin-Bereich
// im Browser offen ist. Fehler bleiben still (Task 7, Brief) -- der Status dazu steht im
// Postfach (abrufAnzeige), ein Toast/Throw hier würde auf jeder Admin-Seite aufpoppen,
// nicht nur im Postfach.
export function MailAbrufer() {
  const router = useRouter()
  const letzterLauf = useRef(0)

  useEffect(() => {
    let abgebrochen = false

    async function lauf() {
      if (
        !sollJetztAbrufen({
          letzterLauf: letzterLauf.current,
          jetzt: Date.now(),
          sichtbar: document.visibilityState === "visible",
          intervallMs: INTERVALL_MS,
        })
      ) {
        return
      }
      try {
        const ergebnis = await fuehreAbrufRundeAus(MAX_EINORDNUNGEN)
        letzterLauf.current = Date.now()
        if (!abgebrochen && ergebnis && (ergebnis.neu > 0 || ergebnis.verarbeitet > 0)) router.refresh()
      } catch (fehler) {
        // Nie in die UI werfen (Brief) -- der Abruf-Status im Postfach kommt ohnehin aus
        // der DB (mail_abruf-Tabelle), ein Konsolen-Log reicht für die Fehlersuche hier.
        console.error("MailAbrufer: Hintergrund-Abruf fehlgeschlagen", fehler)
        letzterLauf.current = Date.now()
      }
    }

    void lauf()
    const intervall = setInterval(() => void lauf(), INTERVALL_MS)
    function beiSichtbarkeitswechsel() {
      if (document.visibilityState === "visible") void lauf()
    }
    document.addEventListener("visibilitychange", beiSichtbarkeitswechsel)

    return () => {
      abgebrochen = true
      clearInterval(intervall)
      document.removeEventListener("visibilitychange", beiSichtbarkeitswechsel)
    }
  }, [router])

  return null
}
