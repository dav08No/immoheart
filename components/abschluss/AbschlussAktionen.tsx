"use client"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/Button"
import {
  abschlussEntwuerfeNachholen,
  reservierungAufheben,
  trefferAblehnen,
  trefferReservieren,
  trefferVermitteln,
} from "@/app/actions/abschluss"
import { AKTION_LABEL, istPrimaerAktion, sichtbareAktionen } from "@/lib/abschluss/folgen-text"
import type { ObjektStatus, TrefferAktion, TrefferStatus } from "@/lib/abschluss/uebergaenge"
import type { Database } from "@/types/database"
import { AbschlussDialog } from "./AbschlussDialog"

type AnfrageStatus = Database["public"]["Enums"]["anfrage_status_enum"]
type Ergebnis = {
  fehler: string | null
  hinweise?: string[]
  fehlend?: number
}

const AUSFUEHREN: Record<TrefferAktion, (matchId: string) => Promise<Ergebnis>> = {
  reservieren: trefferReservieren,
  vermitteln: trefferVermitteln,
  aufheben: reservierungAufheben,
  ablehnen: trefferAblehnen,
}

type Props = {
  matchId: string
  objektId: string
  // Kontext für die Knöpfe, z.B. Objekt- oder Firmenname (zugänglicher Name je Zeile).
  bezeichnung: string
  trefferStatus: TrefferStatus
  objektStatus: ObjektStatus
  anfrageStatus: AnfrageStatus
  andereAngebote: number
  fehlendeEntwuerfe: number
  onFertig: () => void
}

// Wiederverwendbar (Anfrage- und Objekt-Panel): Knöpfe aus den erlaubten Übergängen,
// Bestätigungsdialog mit Folgen, danach Hinweise und ggf. "Entwürfe erneut erzeugen".
export function AbschlussAktionen(p: Props) {
  const [aktion, setAktion] = useState<TrefferAktion | null>(null)
  const [dialogOffen, setDialogOffen] = useState(false)
  const [laufend, setLaufend] = useState(false)
  const [fehler, setFehler] = useState<string | null>(null)
  const [hinweise, setHinweise] = useState<string[]>([])
  const [erfolg, setErfolg] = useState<string | null>(null)
  // Frischer Wert aus der Aktion, bis die neu geladenen Detaildaten ihn ablösen.
  const [fehlendAktuell, setFehlendAktuell] = useState<number | null>(null)
  const rueckmeldungRef = useRef<HTMLDivElement>(null)
  const erfolgRef = useRef(false)

  useEffect(() => setFehlendAktuell(null), [p.fehlendeEntwuerfe])

  const aktionen = sichtbareAktionen(p.trefferStatus, p.objektStatus, p.anfrageStatus)
  const fehlend = fehlendAktuell ?? p.fehlendeEntwuerfe

  function uebernehmen(e: Ergebnis, erfolgText: string) {
    setFehler(e.fehler)
    if (e.fehler) return
    setErfolg(erfolgText)
    setHinweise(e.hinweise ?? [])
    setFehlendAktuell(e.fehlend ?? 0)
    p.onFertig()
  }

  async function mitSperre(schritt: () => Promise<Ergebnis>, erfolgText: string): Promise<boolean> {
    setLaufend(true)
    setErfolg(null)
    try {
      const e = await schritt()
      uebernehmen(e, erfolgText)
      return e.fehler === null
    } catch {
      setFehler("Unerwarteter Fehler. Bitte Seite neu laden.")
      return false
    } finally {
      setLaufend(false)
    }
  }

  async function bestaetigen() {
    if (!aktion || laufend) return
    const gewaehlt = aktion
    erfolgRef.current = await mitSperre(() => AUSFUEHREN[gewaehlt](p.matchId), `${AKTION_LABEL[gewaehlt]}: gespeichert`)
    setDialogOffen(false)
  }

  // Nach Erfolg kann der auslösende Knopf verschwunden sein -> Fokus auf die Rückmeldung.
  function fokusNachSchliessen(ereignis: Event) {
    if (!erfolgRef.current) return
    ereignis.preventDefault()
    erfolgRef.current = false
    rueckmeldungRef.current?.focus()
  }

  return (
    <div className="flex min-w-0 flex-col gap-2">
      {aktionen.length > 0 && (
        <div className="flex flex-wrap justify-end gap-2">
          {aktionen.map((a) => (
            <Button
              key={a}
              variante={istPrimaerAktion(a) ? "primaer" : "sekundaer"}
              aria-label={`${AKTION_LABEL[a]}: ${p.bezeichnung}`}
              disabled={laufend}
              onClick={() => {
                setFehler(null)
                setAktion(a)
                setDialogOffen(true)
              }}
            >
              {AKTION_LABEL[a]}
            </Button>
          ))}
        </div>
      )}
      <div
        ref={rueckmeldungRef}
        tabIndex={-1}
        className="flex flex-col gap-1.5 rounded outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {fehler && (
          <p role="alert" className="text-sm text-crit wrap-break-word">
            {fehler}
          </p>
        )}
        {/* Immer gerendert, damit Screenreader die Rückmeldung als Live-Region ansagen. */}
        <div role="status" className="flex flex-col gap-0.5 text-xs text-ink-2">
          {erfolg && <p>{erfolg}</p>}
          {hinweise.length > 0 && (
            <ul className="flex flex-col gap-0.5">
              {hinweise.map((h, i) => (
                <li key={i} className="wrap-break-word">
                  {h}
                </li>
              ))}
            </ul>
          )}
        </div>
        {fehlend > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-ink-2">{fehlend === 1 ? "1 Entwurf fehlt" : `${fehlend} Entwürfe fehlen`}</p>
            <Button
              disabled={laufend}
              aria-label={`Entwürfe erneut erzeugen: ${p.bezeichnung}`}
              onClick={() => void mitSperre(() => abschlussEntwuerfeNachholen(p.objektId), "Entwürfe erneut erzeugt")}
            >
              {laufend ? "Wird erzeugt…" : "Entwürfe erneut erzeugen"}
            </Button>
          </div>
        )}
      </div>
      <AbschlussDialog
        offen={dialogOffen}
        aktion={aktion}
        andereAngebote={p.andereAngebote}
        laufend={laufend}
        onBestaetigen={() => void bestaetigen()}
        onAbbrechen={() => setDialogOffen(false)}
        onFokusNachSchliessen={fokusNachSchliessen}
      />
    </div>
  )
}
