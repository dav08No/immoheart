"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/Button"
import { FormFeld, EINGABE_KLASSE } from "@/components/ui/FormFeld"
import { entwurfLoeschen, entwurfSpeichern } from "@/app/actions/entwuerfe"
import { entwurfSenden } from "@/app/actions/entwurf-senden"
import { VersandBanner } from "./VersandBanner"
import { PlatzhalterHinweis } from "./PlatzhalterHinweis"
import { istPlatzhalter } from "@/lib/abschluss/entwuerfe-plan"
import { ANGEBOT_GESPERRT, angebotGesperrt } from "@/lib/entwurf-status"
import type { EntwurfMitBezug } from "@/lib/queries/nachrichten"

type Laufend = "speichern" | "senden" | "loeschen" | null
type Bestaetigung = "senden" | "loeschen" | null

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
  // Platzhalter ohne KI-Text: Senden erst, wenn ein Text dasteht (das Schema sperrt ohnehin).
  const platzhalter = istPlatzhalter(entwurf)
  const ohneText = platzhalter && body.trim() === ""
  // Treffer weg/abgeschlossen oder Objekt vergeben: entwurfSenden lehnt ab, also gar nicht anbieten.
  const ohneTreffer = angebotGesperrt(entwurf, entwurf.matchStatus, entwurf.objektStatus)

  async function speichern() {
    setLaufend("speichern")
    try {
      const { fehler } = await entwurfSpeichern(entwurf.id, { an, betreff, body })
      if (fehler) toast.error(fehler)
      else toast.success("Gespeichert")
    } catch {
      toast.error("Unerwarteter Fehler. Bitte Seite neu laden.")
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
    } catch {
      toast.error("Unerwarteter Fehler. Bitte Seite neu laden.")
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
    } catch {
      toast.error("Unerwarteter Fehler. Bitte Seite neu laden.")
    } finally {
      setLaufend(null)
      router.refresh()
    }
  }

  return (
    <div className="flex min-w-0 flex-col">
      <div className="flex flex-col gap-4 p-4 sm:p-5">
        {reserviert && <VersandBanner entwurf={entwurf} />}
        {!reserviert && entwurf.versand_fehler && <p className="text-sm text-crit">{entwurf.versand_fehler}</p>}
        {!reserviert && platzhalter && <PlatzhalterHinweis objektId={entwurf.objekt_id} />}
        {!reserviert && ohneTreffer && (
          <p className="text-sm text-ink-2">{ANGEBOT_GESPERRT}</p>
        )}
        <FormFeld label="An" htmlFor="entwurf-an">
          <input
            id="entwurf-an"
            type="email"
            value={an}
            placeholder="empfaenger@beispiel.ch"
            onChange={(e) => setAn(e.target.value)}
            disabled={gesperrt}
            className={EINGABE_KLASSE}
          />
        </FormFeld>
        <FormFeld label="Betreff" htmlFor="entwurf-betreff">
          <input
            id="entwurf-betreff"
            value={betreff}
            placeholder="Betreff"
            onChange={(e) => setBetreff(e.target.value)}
            disabled={gesperrt}
            className={EINGABE_KLASSE}
          />
        </FormFeld>
        <FormFeld label="Text" htmlFor="entwurf-text">
          <textarea
            id="entwurf-text"
            value={body}
            placeholder="Mailtext"
            onChange={(e) => setBody(e.target.value)}
            rows={12}
            disabled={gesperrt}
            className={EINGABE_KLASSE}
          />
        </FormFeld>
      </div>

      {/* Feste Leiste am Fuss des Editors (Ruling R3): Primäraktion (Senden) rechts,
          Sekundär/gefährlich (Speichern/Löschen) links -- bleibt beim Scrollen langer
          Mailtexte sichtbar, wie der Drawer-Fuss in Matches/Anfragen. */}
      {!reserviert && (
        <div className="sticky bottom-0 z-10 flex flex-col gap-3 rounded-b-panel border-t border-line bg-surface px-4 py-3 sm:px-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap gap-2">
              <Button variante="gefaehrlich" onClick={() => setBestaetigung("loeschen")} disabled={gesperrt}>
                Löschen
              </Button>
              <Button variante="sekundaer" onClick={speichern} disabled={gesperrt || !geaendert}>
                {laufend === "speichern" ? "Wird gespeichert…" : "Speichern"}
              </Button>
            </div>
            <Button variante="primaer" onClick={() => setBestaetigung("senden")} disabled={gesperrt || ohneText || ohneTreffer}>
              Senden
            </Button>
          </div>

          {bestaetigung === "senden" && (
            <div className="flex flex-wrap items-center gap-2 border-t border-dashed border-line-2 pt-3 text-sm text-ink-2">
              An {an || "?"} senden?
              <Button variante="primaer" onClick={senden} disabled={laufend !== null}>
                {laufend === "senden" ? "Wird gesendet…" : "Jetzt senden"}
              </Button>
              <Button variante="sekundaer" onClick={() => setBestaetigung(null)} disabled={laufend !== null}>
                Abbrechen
              </Button>
            </div>
          )}

          {bestaetigung === "loeschen" && (
            <div className="flex flex-wrap items-center gap-2 border-t border-dashed border-line-2 pt-3 text-sm text-ink-2">
              Entwurf wirklich löschen?
              <Button variante="gefaehrlich" onClick={loeschen} disabled={laufend !== null}>
                {laufend === "loeschen" ? "Wird gelöscht…" : "Ja, löschen"}
              </Button>
              <Button variante="sekundaer" onClick={() => setBestaetigung(null)} disabled={laufend !== null}>
                Abbrechen
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
