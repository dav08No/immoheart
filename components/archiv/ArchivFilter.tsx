"use client"

import { FormFeld, EINGABE_KLASSE } from "@/components/ui/FormFeld"
import { formatZahl } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { Zeitraum } from "@/lib/archiv/filter"

export type ArchivTab = "treffer" | "objekte" | "anfragen"

const TABS: { wert: ArchivTab; label: string }[] = [
  { wert: "treffer", label: "Treffer" },
  { wert: "objekte", label: "Objekte" },
  { wert: "anfragen", label: "Anfragen" },
]

const FOKUS = "outline-none focus-visible:ring-2 focus-visible:ring-ring"

type Props = {
  tab: ArchivTab
  anzahl: Record<ArchivTab, number>
  zeitraum: Zeitraum
  jahre: number[]
  suche: string
  onTab: (tab: ArchivTab) => void
  onZeitraum: (zeitraum: Zeitraum) => void
  onSuche: (suche: string) => void
}

function alsZeitraum(wert: string): Zeitraum {
  return wert === "12m" || wert === "alles" ? wert : Number(wert)
}

// Gleiches Segment-Muster wie im Postfach: drei gleich breite Felder passen auf 360 px.
export function ArchivFilter({ tab, anzahl, zeitraum, jahre, suche, onTab, onZeitraum, onSuche }: Props) {
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-3 gap-0.5 rounded-lg bg-surface-3 p-0.5" role="group" aria-label="Archiv-Bereich">
        {TABS.map(({ wert, label }) => {
          const aktiv = tab === wert
          return (
            <button
              key={wert}
              type="button"
              onClick={() => onTab(wert)}
              aria-pressed={aktiv}
              className={cn(
                FOKUS,
                "min-w-0 truncate rounded-md px-1.5 py-1.5 text-xs transition-colors",
                aktiv ? "bg-brand font-semibold text-on-brand" : "text-ink-2 hover:bg-surface hover:text-ink",
              )}
            >
              {label} <span className="tabular-nums">{formatZahl(anzahl[wert])}</span>
            </button>
          )
        })}
      </div>
      <div className="grid gap-3 sm:grid-cols-[12rem_1fr]">
        <FormFeld label="Zeitraum" htmlFor="archiv-zeitraum">
          <select
            id="archiv-zeitraum"
            value={String(zeitraum)}
            onChange={(e) => onZeitraum(alsZeitraum(e.target.value))}
            className={EINGABE_KLASSE}
          >
            <option value="12m">Letzte 12 Monate</option>
            {jahre.map((j) => (
              <option key={j} value={String(j)}>
                {j}
              </option>
            ))}
            <option value="alles">Alles</option>
          </select>
        </FormFeld>
        <FormFeld label="Suche" htmlFor="archiv-suche" hinweis="Firma, Objekt oder Grund">
          <input
            id="archiv-suche"
            type="search"
            value={suche}
            onChange={(e) => onSuche(e.target.value)}
            aria-describedby="archiv-suche-hinweis"
            className={EINGABE_KLASSE}
          />
        </FormFeld>
      </div>
    </div>
  )
}
