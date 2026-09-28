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
  match, laufend, onOeffnen, onSenden, onVerwerfen,
}: {
  match: NeuerMatch
  laufend: boolean
  onOeffnen: () => void
  onSenden: () => void
  onVerwerfen: () => void
}) {
  return (
    <article onClick={onOeffnen} className="cursor-pointer overflow-hidden rounded-card border border-line bg-surface hover:border-line-2">
      {/* Handy: Bild | Objekt | Score oben, die Firma als eigene Zeile darunter
          (order-last); ab sm die fünfspaltige Zeile mit Pfeil. */}
      <div className="grid grid-cols-[64px_minmax(0,1fr)_auto] items-center gap-3 p-3 sm:grid-cols-[118px_minmax(0,1fr)_34px_minmax(0,1fr)_auto] sm:gap-3.5">
        <div className="size-16 overflow-hidden rounded-lg bg-surface-3 sm:h-20 sm:w-[118px]">
          {match.objekt.titelbild && (
            // eslint-disable-next-line @next/next/no-img-element -- Storage- oder freie URL, kein next/image-Loader konfiguriert
            <img src={match.objekt.titelbild} alt={match.objekt.titel} className="h-full w-full object-cover" />
          )}
        </div>
        <div className="min-w-0">
          <div className="wrap-break-word text-sm font-semibold text-ink">{match.objekt.titel}</div>
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
        <span className="hidden h-[34px] w-[34px] place-items-center rounded-full bg-brand-soft text-brand sm:grid">↔</span>
        <div className="order-last col-span-3 min-w-0 border-t border-line pt-2.5 sm:order-none sm:col-span-1 sm:border-t-0 sm:pt-0">
          <div className="wrap-break-word text-sm font-semibold text-ink">{match.firma?.name ?? "?"}</div>
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
          disabled={laufend}
          className="rounded-lg bg-brand px-2.5 py-1 text-xs font-medium text-on-brand hover:bg-brand-2 disabled:opacity-60"
        >
          {laufend ? "Wird bearbeitet…" : "Angebot entwerfen"}
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onVerwerfen() }}
          disabled={laufend}
          className="rounded-lg border border-line-2 px-2.5 py-1 text-xs text-ink hover:bg-surface disabled:opacity-60"
        >
          Verwerfen
        </button>
      </div>
    </article>
  )
}
