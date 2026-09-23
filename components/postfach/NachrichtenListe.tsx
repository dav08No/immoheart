import type { NachrichtRow } from "@/lib/queries/nachrichten"

export type PostfachFilter = "alle" | "eingang" | "entwurf"

type Props = {
  nachrichten: NachrichtRow[]
  filter: PostfachFilter
  ausgewaehlteId: string | null
  onFilterWechsel: (filter: PostfachFilter) => void
  onAuswahl: (id: string) => void
}

export function NachrichtenListe({ nachrichten, filter, ausgewaehlteId, onFilterWechsel, onAuswahl }: Props) {
  const gefiltert = nachrichten.filter((n) => {
    if (filter === "alle") return true
    if (filter === "eingang") return n.richtung === "eingang"
    return n.richtung === "entwurf"
  })

  return (
    <div className="rounded-card border border-line bg-surface">
      <div className="flex gap-1.5 border-b border-line p-2.5">
        {(["alle", "eingang", "entwurf"] as const).map((option) => (
          <button
            key={option}
            onClick={() => onFilterWechsel(option)}
            aria-pressed={filter === option}
            className={`rounded-full border px-2.5 py-1 text-xs ${
              filter === option ? "border-navy bg-navy text-white" : "border-line text-ink-2"
            }`}
          >
            {option === "alle" ? "Alle" : option === "eingang" ? "Eingang" : "Entwürfe"}
          </button>
        ))}
      </div>
      {gefiltert.length === 0 && <p className="p-6 text-center text-sm text-ink-3">Nichts hier.</p>}
      {gefiltert.map((nachricht) => (
        <button
          key={nachricht.id}
          onClick={() => onAuswahl(nachricht.id)}
          aria-current={nachricht.id === ausgewaehlteId ? "true" : undefined}
          className={`flex w-full gap-2.5 border-b border-line p-3 text-left last:border-b-0 hover:bg-surface-2 ${
            nachricht.id === ausgewaehlteId ? "bg-brand-soft" : ""
          }`}
        >
          <span
            className={`grid h-[26px] w-[26px] flex-none place-items-center rounded-lg text-sm ${
              nachricht.richtung === "eingang"
                ? "bg-surface-3 text-ink-2"
                : nachricht.richtung === "gesendet"
                  ? "bg-good-bg text-good"
                  : "bg-brand text-on-brand"
            }`}
          >
            {nachricht.richtung === "eingang" ? "↓" : nachricht.richtung === "gesendet" ? "✓" : "↑"}
          </span>
          <span className="flex min-w-0 flex-col gap-0.5">
            <span className="truncate text-sm font-medium text-ink">{nachricht.betreff}</span>
            <span className="truncate text-xs text-ink-3">{nachricht.von}</span>
          </span>
        </button>
      ))}
    </div>
  )
}
