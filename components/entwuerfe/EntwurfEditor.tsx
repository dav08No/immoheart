"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/Button"
import { entwurfLoeschen, entwurfSpeichern } from "@/app/actions/entwuerfe"
import { entwurfSenden } from "@/app/actions/entwurf-senden"
import { VersandBanner } from "./VersandBanner"
import type { EntwurfMitBezug } from "@/lib/queries/nachrichten"

type Laufend = "speichern" | "senden" | "loeschen" | null
type Bestaetigung = "senden" | "loeschen" | null
const FELD = "rounded-lg border border-line-2 px-3 py-2 text-sm text-ink disabled:opacity-60"

// Wird von EntwuerfeAnsicht immer mit key={entwurf.id} gerendert -- ein
// Wechsel der Auswahl mountet diese Komponente also komplett neu, statt das
// Prop auf eine bestehende Instanz zu übertragen. Lokaler State (Eingaben,
// Bestätigungs-Dialoge, laufend) muss deshalb NICHT manuell beim Wechsel
// zurückgesetzt werden.
export function EntwurfEditor({ entwurf }: { entwurf: EntwurfMitBezug }) {
  const router = useRouter()
  const [an, setAn] = useState(entwurf.an)
  const [betreff, setBetreff] = useState(entwurf.betreff)
  const [body, setBody] = useState(entwurf.body)
  const [laufend, setLaufend] = useState<Laufend>(null)
  // Nur EIN Bestätigungs-Panel gleichzeitig offen -- Senden/Löschen schliessen sich
  // gegenseitig, statt sich zu überlagern. Die Freigeben-/Als-gesendet-Bestätigungen
  // für einen reservierten Entwurf leben mit eigenem State in VersandBanner.
  const [bestaetigung, setBestaetigung] = useState<Bestaetigung>(null)

  // gesendet_am gesetzt, aber richtung noch "entwurf": Versand-Ergebnis unklar oder noch
  // im Gange (siehe VersandBanner und reservierungFreigeben in app/actions/entwuerfe.ts).
  // Bearbeiten/Senden/Löschen sind hier gesperrt, weil der Entwurf möglicherweise gerade
  // wirklich unterwegs ist -- ein zweiter Versand könnte die Mail duplizieren.
  const reserviert = entwurf.gesendet_am !== null
  const geaendert = an !== entwurf.an || betreff !== entwurf.betreff || body !== entwurf.body
  const gesperrt = laufend !== null || reserviert

  async function speichern() {
    setLaufend("speichern")
    try {
      const { fehler } = await entwurfSpeichern(entwurf.id, { an, betreff, body })
      if (fehler) toast.error(fehler)
      else toast.success("Gespeichert")
    } finally {
      setLaufend(null)
      router.refresh()
    }
  }

  async function senden() {
    setLaufend("senden")
    try {
      const speichernErgebnis = await entwurfSpeichern(entwurf.id, { an, betreff, body })
      if (speichernErgebnis.fehler) {
        toast.error(speichernErgebnis.fehler)
        return
      }
      const { fehler } = await entwurfSenden(entwurf.id)
      if (fehler) toast.error(fehler)
      else {
        toast.success("Gesendet")
        setBestaetigung(null)
      }
    } finally {
      setLaufend(null)
      router.refresh()
    }
  }

  async function loeschen() {
    setLaufend("loeschen")
    try {
      const { fehler } = await entwurfLoeschen(entwurf.id)
      if (fehler) toast.error(fehler)
      else toast.success("Gelöscht")
    } finally {
      setLaufend(null)
      router.refresh()
    }
  }

  return (
    <div className="p-4">
      {reserviert && <VersandBanner entwurf={entwurf} />}

      {!reserviert && entwurf.versand_fehler && <p className="mb-3 text-sm text-crit">{entwurf.versand_fehler}</p>}

      <div className="flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-ink-2">An</span>
          <input
            type="email"
            value={an}
            placeholder="empfaenger@beispiel.ch"
            onChange={(e) => setAn(e.target.value)}
            disabled={gesperrt}
            className={FELD}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-ink-2">Betreff</span>
          <input
            value={betreff}
            placeholder="Betreff"
            onChange={(e) => setBetreff(e.target.value)}
            disabled={gesperrt}
            className={FELD}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-ink-2">Text</span>
          <textarea
            value={body}
            placeholder="Mailtext"
            onChange={(e) => setBody(e.target.value)}
            rows={12}
            disabled={gesperrt}
            className={FELD}
          />
        </label>
      </div>

      {!reserviert && (
        <div className="mt-3.5 flex flex-wrap gap-2">
          <Button onClick={speichern} disabled={gesperrt || !geaendert}>
            {laufend === "speichern" ? "Wird gespeichert…" : "Speichern"}
          </Button>
          <Button variante="primaer" onClick={() => setBestaetigung("senden")} disabled={gesperrt}>
            Senden
          </Button>
          <Button onClick={() => setBestaetigung("loeschen")} disabled={gesperrt}>
            Löschen
          </Button>
        </div>
      )}

      {!reserviert && bestaetigung === "senden" && (
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-dashed border-line-2 pt-3 text-sm text-ink-2">
          An {an || "?"} senden?
          <Button variante="primaer" onClick={senden} disabled={laufend !== null}>
            {laufend === "senden" ? "Wird gesendet…" : "Jetzt senden"}
          </Button>
          <Button onClick={() => setBestaetigung(null)} disabled={laufend !== null}>
            Abbrechen
          </Button>
        </div>
      )}

      {!reserviert && bestaetigung === "loeschen" && (
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-dashed border-line-2 pt-3 text-sm text-ink-2">
          Entwurf wirklich löschen?
          <Button onClick={loeschen} disabled={laufend !== null}>
            {laufend === "loeschen" ? "Wird gelöscht…" : "Ja, löschen"}
          </Button>
          <Button onClick={() => setBestaetigung(null)} disabled={laufend !== null}>
            Abbrechen
          </Button>
        </div>
      )}
    </div>
  )
}
