"use client"

import { Button } from "@/components/ui/Button"
import { abschlussEntwuerfeNachholen } from "@/app/actions/abschluss"
import type { AbschlussLauf } from "./useAbschlussLauf"

type Props = {
  lauf: AbschlussLauf
  objektId: string
  bezeichnung: string
  // Im Objekt-Panel zeigt nur der Objekt-Block die fehlenden Entwürfe, nicht jede Zeile.
  fehlendeAnzeigen?: boolean
}

// Rückmeldung nach einer Abschluss-Aktion: Fehler, Erfolg, Hinweise und "N Entwürfe fehlen".
export function AbschlussRueckmeldung({ lauf, objektId, bezeichnung, fehlendeAnzeigen = true }: Props) {
  const fehlend = fehlendeAnzeigen ? lauf.fehlend : 0
  return (
    <div
      ref={lauf.rueckmeldungRef}
      tabIndex={-1}
      className="flex flex-col gap-1.5 rounded outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {lauf.fehler && (
        <p role="alert" className="text-sm text-crit wrap-break-word">
          {lauf.fehler}
        </p>
      )}
      {/* Immer gerendert, damit Screenreader die Rückmeldung als Live-Region ansagen. */}
      <div role="status" className="flex flex-col gap-0.5 text-xs text-ink-2">
        {lauf.erfolg && <p>{lauf.erfolg}</p>}
        {lauf.hinweise.length > 0 && (
          <ul className="flex flex-col gap-0.5">
            {lauf.hinweise.map((h, i) => (
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
            disabled={lauf.laufend}
            aria-label={`Entwürfe erneut erzeugen: ${bezeichnung}`}
            onClick={() => void lauf.mitSperre(() => abschlussEntwuerfeNachholen(objektId), "Entwürfe erneut erzeugt")}
          >
            {lauf.laufend ? "Wird erzeugt…" : "Entwürfe erneut erzeugen"}
          </Button>
        </div>
      )}
    </div>
  )
}
