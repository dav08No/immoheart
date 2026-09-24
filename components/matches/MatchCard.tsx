import type { NeuerMatch } from "@/lib/queries/matches"
import type { KriteriumStatus } from "@/types"

function mapsLink(adresse: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(adresse)}`
}
function webLink(name: string): string {
  return `https://www.google.com/search?q=${encodeURIComponent(name)}`
}

const STATUS_ZEICHEN: Record<KriteriumStatus, string> = { ok: "✓", teilweise: "~", nein: "✕" }
const STATUS_FARBE: Record<KriteriumStatus, string> = { ok: "text-good", teilweise: "text-warn", nein: "text-crit" }

export function MatchCard({
  match, onOeffnen, onSenden, onVerwerfen,
}: {
  match: NeuerMatch
  onOeffnen: () => void
  onSenden: () => void
  onVerwerfen: () => void
}) {
  return (
    <article onClick={onOeffnen} className="cursor-pointer overflow-hidden rounded-card border border-line bg-surface hover:border-line-2">
      <div className="grid grid-cols-[118px_minmax(0,1fr)_34px_minmax(0,1fr)_auto] items-center gap-3.5 p-3">
        <div className="h-20 w-[118px] overflow-hidden rounded-lg bg-surface-3">
          {match.objekt.foto_url && (
            // eslint-disable-next-line @next/next/no-img-element -- freie Foto-URL ohne Upload, siehe README
            <img src={match.objekt.foto_url} alt={match.objekt.titel} className="h-full w-full object-cover" />
          )}
        </div>
        <div>
          <div className="text-sm font-semibold text-ink">{match.objekt.titel}</div>
          <div className="mt-0.5 text-xs text-ink-2">
            {match.objekt.flaeche} m² · {match.objekt.preis_pro_m2 !== null ? `CHF ${match.objekt.preis_pro_m2}/m²` : "auf Anfrage"}
          </div>
          <a
            href={mapsLink(match.objekt.adresse)} target="_blank" rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()} className="mt-0.5 block text-xs text-brand hover:underline"
          >
            Karte ↗
          </a>
        </div>
        <span className="grid h-[34px] w-[34px] place-items-center rounded-full bg-brand-soft text-brand">↔</span>
        <div>
          <div className="text-sm font-semibold text-ink">
            {match.firma?.name ?? (match.anfrage.vertraulich ? "vertraulich" : "?")}
          </div>
          <div className="mt-0.5 text-xs text-ink-2">
            sucht {match.anfrage.flaeche_min ?? "?"}–{match.anfrage.flaeche_max ?? "?"} m²
          </div>
          {match.firma && (
            <a
              href={webLink(match.firma.name)} target="_blank" rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()} className="mt-0.5 block text-xs text-brand hover:underline"
            >
              Website ↗
            </a>
          )}
        </div>
        <div className="text-right">
          <div className="font-display text-2xl font-bold text-good">{match.score}%</div>
          <div className="text-xs text-ink-3">Treffer</div>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 border-t border-line bg-surface-2 px-3.5 py-2.5">
        <span className="mr-auto flex flex-wrap gap-1.5">
          {match.kriterien.map((k) => (
            <span
              key={k.kriterium}
              className={`rounded-full border border-line bg-surface px-2 py-0.5 text-[11.5px] ${STATUS_FARBE[k.status]}`}
            >
              {k.kriterium} {STATUS_ZEICHEN[k.status]}
            </span>
          ))}
        </span>
        <button
          onClick={(e) => { e.stopPropagation(); onSenden() }}
          className="rounded-lg bg-brand px-2.5 py-1 text-xs font-medium text-on-brand hover:bg-brand-2"
        >
          Angebot senden
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onVerwerfen() }}
          className="rounded-lg border border-line-2 px-2.5 py-1 text-xs text-ink hover:bg-surface"
        >
          Verwerfen
        </button>
      </div>
    </article>
  )
}
