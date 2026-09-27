"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/Button"
import { entwurfLoeschen, entwurfSenden, entwurfSpeichern, reservierungFreigeben } from "@/app/actions/entwuerfe"
import type { EntwurfMitBezug } from "@/lib/queries/nachrichten"

type Laufend = "speichern" | "senden" | "loeschen" | "freigeben" | null
const FELD = "rounded-lg border border-line-2 px-3 py-2 text-sm text-ink disabled:opacity-60"

// Wird von EntwuerfeAnsicht immer mit key={entwurf.id} gerendert -- ein
// Wechsel der Auswahl mountet diese Komponente also komplett neu, statt das
// Prop auf eine bestehende Instanz zu übertragen. Lokaler State (Eingaben,
// Bestätigungs-Dialoge, laufend) muss deshalb NICHT manuell beim Wechsel
// zurückgesetzt werden (anders als z.B. components/postfach/EntwurfDetail.tsx).
export function EntwurfEditor({ entwurf }: { entwurf: EntwurfMitBezug }) {
  const [an, setAn] = useState(entwurf.an)
  const [betreff, setBetreff] = useState(entwurf.betreff)
  const [body, setBody] = useState(entwurf.body)
  const [laufend, setLaufend] = useState<Laufend>(null)
  const [sendenBestaetigen, setSendenBestaetigen] = useState(false)
  const [loeschenBestaetigen, setLoeschenBestaetigen] = useState(false)

  // gesendet_am gesetzt, aber richtung noch "entwurf": Versand-Ergebnis unklar
  // (siehe reservierungFreigeben in app/actions/entwuerfe.ts). Bearbeiten/
  // Senden/Löschen sind hier gesperrt, weil der Entwurf möglicherweise gerade
  // wirklich unterwegs ist -- ein zweiter Versand könnte die Mail duplizieren.
  const reserviert = entwurf.gesendet_am !== null
  const geaendert = an !== entwurf.an || betreff !== entwurf.betreff || body !== entwurf.body
  const gesperrt = laufend !== null || reserviert

  async function speichern() {
    setLaufend("speichern")
    try {
      await entwurfSpeichern(entwurf.id, { an, betreff, body })
      toast.success("Gespeichert")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Entwurf konnte nicht gespeichert werden.")
    } finally {
      setLaufend(null)
    }
  }

  async function senden() {
    setLaufend("senden")
    try {
      await entwurfSpeichern(entwurf.id, { an, betreff, body })
      await entwurfSenden(entwurf.id)
      toast.success("Gesendet")
      setSendenBestaetigen(false)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Versand fehlgeschlagen.")
    } finally {
      setLaufend(null)
    }
  }

  async function loeschen() {
    setLaufend("loeschen")
    try {
      await entwurfLoeschen(entwurf.id)
      toast.success("Gelöscht")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Entwurf konnte nicht gelöscht werden.")
    } finally {
      setLaufend(null)
    }
  }

  async function freigeben() {
    setLaufend("freigeben")
    try {
      await reservierungFreigeben(entwurf.id)
      toast.success("Reservierung freigegeben")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Reservierung konnte nicht freigegeben werden.")
    } finally {
      setLaufend(null)
    }
  }

  return (
    <div className="p-4">
      {reserviert && (
        <div className="mb-3.5 flex flex-wrap items-center gap-3 rounded-lg border border-warn bg-warn-bg p-3 text-sm text-warn">
          <span className="flex-1">
            Versand unklar – bitte im Gmail-Ordner „Gesendet” prüfen, bevor Sie erneut senden.
          </span>
          <Button onClick={freigeben} disabled={laufend !== null}>
            {laufend === "freigeben" ? "Wird freigegeben…" : "Reservierung freigeben"}
          </Button>
        </div>
      )}

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
          <Button variante="primaer" onClick={() => setSendenBestaetigen(true)} disabled={gesperrt}>
            Senden
          </Button>
          <Button onClick={() => setLoeschenBestaetigen(true)} disabled={gesperrt}>
            Löschen
          </Button>
        </div>
      )}

      {!reserviert && sendenBestaetigen && (
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-dashed border-line-2 pt-3 text-sm text-ink-2">
          An {an || "?"} senden?
          <Button variante="primaer" onClick={senden} disabled={laufend !== null}>
            {laufend === "senden" ? "Wird gesendet…" : "Jetzt senden"}
          </Button>
          <Button onClick={() => setSendenBestaetigen(false)} disabled={laufend !== null}>
            Abbrechen
          </Button>
        </div>
      )}

      {!reserviert && loeschenBestaetigen && (
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-dashed border-line-2 pt-3 text-sm text-ink-2">
          Entwurf wirklich löschen?
          <Button onClick={loeschen} disabled={laufend !== null}>
            {laufend === "loeschen" ? "Wird gelöscht…" : "Ja, löschen"}
          </Button>
          <Button onClick={() => setLoeschenBestaetigen(false)} disabled={laufend !== null}>
            Abbrechen
          </Button>
        </div>
      )}
    </div>
  )
}
