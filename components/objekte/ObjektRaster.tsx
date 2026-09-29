import { EyeOff, ImageIcon, Inbox, MapPin, Sparkles } from "lucide-react"
import { StatusChip } from "@/components/ui/StatusChip"
import { objektStatusTon } from "@/lib/ui/status-ton"
import type { Database } from "@/types/database"

type ObjektRow = Database["public"]["Tables"]["objekte"]["Row"]
type ObjektStatus = Database["public"]["Enums"]["objekt_status_enum"]

function mapsLink(adresse: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(adresse)}`
}

export const STATUS_LABEL: Record<ObjektStatus, string> = {
  verfuegbar: "Verfügbar",
  reserviert: "Reserviert",
  vermietet: "Vermietet",
}

/**
 * `treffer[objektId]` wird als status='neu'-gefilterte Zählung erwartet (nur noch
 * offene Matches, via zaehleNeueMatchesFuerObjekt), NICHT die ungefilterte Zählung
 * über alle match_status-Werte -- sonst bliebe "12 neue Treffer" stehen, obwohl
 * längst alles gesendet oder verworfen ist, und die Zahl verlöre ihren Signalwert.
 * Diese Komponente bekommt nur die fertige Zahl und kann selbst nicht filtern.
 */
export function ObjektRaster({
  objekte,
  treffer,
  titelbilder,
  direktanfragen,
  onKarteWahl,
}: {
  objekte: ObjektRow[]
  treffer: Record<string, number>
  titelbilder: Record<string, string>
  direktanfragen: Record<string, number>
  onKarteWahl: (id: string) => void
}) {
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(min(260px,100%),1fr))] gap-4">
      {objekte.map((o) => {
        // Nicht verfügbare Objekte bleiben im Raster, sollen aber nicht wie verfügbare
        // aussehen: Chip plus abgeblendetes Bild. Nur das Bild wird blass, nicht der
        // Text -- sonst fiele dessen Kontrast unter 4.5:1.
        const nichtVerfuegbar = o.status !== "verfuegbar"
        // Hochgeladenes Titelbild vor der alten Foto-URL (Spalte bleibt als Fallback).
        const bild = titelbilder[o.id] ?? o.foto_url
        const anfragen = direktanfragen[o.id] ?? 0
        return (
          <article
            key={o.id}
            onClick={() => onKarteWahl(o.id)}
            className="relative flex min-w-0 cursor-pointer flex-col overflow-hidden rounded-panel border border-line bg-surface shadow-panel transition-colors hover:border-line-2 focus-within:ring-2 focus-within:ring-ring motion-reduce:transition-none"
          >
            <div className={`grid aspect-[16/9] place-items-center bg-surface-3 text-xs text-ink-2 ${nichtVerfuegbar ? "opacity-60" : ""}`}>
              {bild ? (
                // eslint-disable-next-line @next/next/no-img-element -- Storage- oder freie URL, kein next/image-Loader konfiguriert
                <img src={bild} alt={o.titel} className="size-full object-cover" />
              ) : (
                <span className="flex flex-col items-center gap-1">
                  <ImageIcon className="size-5" aria-hidden />
                  Foto
                </span>
              )}
            </div>
            <div className="flex flex-1 flex-col gap-2 p-4">
              <div className="flex items-start justify-between gap-2">
                <h2 className="flex min-w-0 items-start gap-1.5 font-display text-base font-semibold text-ink">
                  {!o.oeffentlich && (
                    <EyeOff className="mt-1 size-3.5 shrink-0 text-ink-2" role="img" aria-label="Nicht auf der Website" />
                  )}
                  {/* Echter Knopf für Tastatur/Screenreader; after: macht die ganze Karte klickbar. */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      onKarteWahl(o.id)
                    }}
                    title={o.titel}
                    className="min-w-0 text-left outline-none after:absolute after:inset-0"
                  >
                    <span className="line-clamp-2 wrap-anywhere">{o.titel}</span>
                  </button>
                </h2>
                <span className="shrink-0">
                  <StatusChip ton={objektStatusTon(o.status)}>{STATUS_LABEL[o.status]}</StatusChip>
                </span>
              </div>
              <div className="text-sm text-ink-2">
                {o.flaeche} m² · {o.preis_pro_m2 !== null ? `CHF ${o.preis_pro_m2}/m²` : "auf Anfrage"}
              </div>
              <div className="truncate text-xs text-ink-2" title={o.eigentuemer}>
                {o.eigentuemer}
              </div>
              <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-line pt-2.5 text-xs text-ink-2">
                <a
                  href={mapsLink(o.adresse)}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="relative z-[1] inline-flex items-center gap-1 rounded text-brand outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <MapPin className="size-3.5" aria-hidden />
                  Karte ↗
                </a>
                <span className="inline-flex items-center gap-1">
                  <Sparkles className="size-3.5" aria-hidden />
                  {treffer[o.id] ?? 0} neue Treffer
                </span>
                <span className="inline-flex items-center gap-1">
                  <Inbox className="size-3.5" aria-hidden />
                  {anfragen} {anfragen === 1 ? "Direktanfrage" : "Direktanfragen"}
                </span>
              </div>
            </div>
          </article>
        )
      })}
    </div>
  )
}
