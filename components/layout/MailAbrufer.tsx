"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { fuehreAbrufRundeAus } from "@/lib/postfach-abruf"
import { erstelleAbrufTakt } from "@/lib/mail-abruf-timing"

const INTERVALL_MS = 120_000
// Kurzer Takt, erstelleAbrufTakt entscheidet: so liegen zwei Rundenstarts 120-135 s
// auseinander, statt dass ein 120-s-Timer knapp zu früh feuert und einen Takt verliert.
const TAKT_MS = 15_000
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

  useEffect(() => {
    let abgebrochen = false

    const lauf = erstelleAbrufTakt({
      intervallMs: INTERVALL_MS,
      jetzt: () => Date.now(),
      sichtbar: () => document.visibilityState === "visible",
      runde: async () => {
        try {
          const ergebnis = await fuehreAbrufRundeAus(MAX_EINORDNUNGEN)
          if (!abgebrochen && ergebnis && (ergebnis.neu > 0 || ergebnis.verarbeitet > 0)) router.refresh()
          return ergebnis !== null
        } catch (fehler) {
          // Nie in die UI werfen (Brief) -- der Abruf-Status im Postfach kommt ohnehin
          // aus der DB (mail_abruf-Tabelle), ein Konsolen-Log reicht hier. Die Runde lief
          // (der Server hat geantwortet), also nicht sofort im nächsten Takt wiederholen.
          console.error("MailAbrufer: Hintergrund-Abruf fehlgeschlagen", fehler)
          return true
        }
      },
    })

    void lauf()
    const intervall = setInterval(() => void lauf(), TAKT_MS)
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
