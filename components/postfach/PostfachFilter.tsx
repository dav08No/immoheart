import { KATEGORIE_CHIPS, type KategorieChip, type PostfachFilter as Filter } from "@/lib/postfach"
import { cn } from "@/lib/utils"

const FILTER: { wert: Filter; label: string }[] = [
  { wert: "alle", label: "Alle" },
  { wert: "eingang", label: "Eingang" },
  { wert: "website", label: "Website" },
  { wert: "gesendet", label: "Gesendet" },
]

const FOKUS = "outline-none focus-visible:ring-2 focus-visible:ring-ring"

type Props = {
  filter: Filter
  chip: KategorieChip | null
  zaehler: Record<KategorieChip, number>
  onFilter: (filter: Filter) => void
  onChip: (chip: KategorieChip | null) => void
}

export function PostfachFilter({ filter, chip, zaehler, onFilter, onChip }: Props) {
  return (
    <div className="flex flex-col gap-2.5 border-b border-line p-3">
      {/* Segment-Leiste: vier gleich breite Felder passen auch auf 360 px in eine Zeile;
          der aktive Ordner gefüllt (Petrol), damit er nicht nur über einen Grauton erkennbar ist. */}
      <div className="grid grid-cols-4 gap-0.5 rounded-lg bg-surface-3 p-0.5" role="group" aria-label="Ordner">
        {FILTER.map(({ wert, label }) => {
          const aktiv = filter === wert
          return (
            <button
              key={wert}
              type="button"
              onClick={() => onFilter(wert)}
              aria-pressed={aktiv}
              className={cn(
                FOKUS,
                "min-w-0 truncate rounded-md px-1.5 py-1.5 text-xs transition-colors",
                aktiv ? "bg-brand font-semibold text-on-brand" : "text-ink-2 hover:bg-surface hover:text-ink"
              )}
            >
              {label}
            </button>
          )
        })}
      </div>
      {filter !== "gesendet" && (
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Kategorie">
          {KATEGORIE_CHIPS.map(({ wert, label }) => {
            const aktiv = chip === wert
            return (
              <button
                key={wert}
                type="button"
                // Erneuter Klick auf den aktiven Chip hebt die Einschränkung wieder auf.
                onClick={() => onChip(aktiv ? null : wert)}
                aria-pressed={aktiv}
                className={cn(
                  FOKUS,
                  "rounded-full border px-2.5 py-1 text-xs transition-colors",
                  aktiv ? "border-brand bg-brand-soft font-medium text-brand" : "border-line text-ink-2 hover:bg-surface-2"
                )}
              >
                {label} <span className="tabular-nums">{zaehler[wert]}</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
