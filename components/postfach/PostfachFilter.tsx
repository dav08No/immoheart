import { KATEGORIE_CHIPS, type KategorieChip, type PostfachFilter as Filter } from "@/lib/postfach"

const FILTER: { wert: Filter; label: string }[] = [
  { wert: "alle", label: "Alle" },
  { wert: "eingang", label: "Eingang" },
  { wert: "website", label: "Website" },
  { wert: "gesendet", label: "Gesendet" },
]

const BASIS = "rounded-full border px-2.5 py-1 text-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"

type Props = {
  filter: Filter
  chip: KategorieChip | null
  zaehler: Record<KategorieChip, number>
  onFilter: (filter: Filter) => void
  onChip: (chip: KategorieChip | null) => void
}

export function PostfachFilter({ filter, chip, zaehler, onFilter, onChip }: Props) {
  return (
    <div className="flex flex-col gap-2 border-b border-line p-2.5">
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Ordner">
        {FILTER.map(({ wert, label }) => (
          <button
            key={wert}
            type="button"
            onClick={() => onFilter(wert)}
            aria-pressed={filter === wert}
            className={`${BASIS} ${filter === wert ? "border-navy bg-navy text-white" : "border-line text-ink-2 hover:bg-surface-2"}`}
          >
            {label}
          </button>
        ))}
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
                className={`${BASIS} ${aktiv ? "border-brand bg-brand-soft text-brand" : "border-line text-ink-3 hover:bg-surface-2"}`}
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
