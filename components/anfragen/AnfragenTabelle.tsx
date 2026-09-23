import { Chip } from "@/components/ui/Chip"
import { puls, pulsFarbe } from "@/lib/puls"
import type { AnfrageMitFirma } from "@/lib/queries/anfragen"

function mapsLink(ort: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${ort}, Schweiz`)}`
}

export function AnfragenTabelle({
  anfragen,
  onZeileWahl,
}: {
  anfragen: AnfrageMitFirma[]
  onZeileWahl: (id: string, bearbeitenSofort: boolean) => void
}) {
  return (
    <div className="overflow-x-auto rounded-card border border-line bg-surface">
      <table className="w-full min-w-[720px] border-collapse">
        <thead>
          <tr>
            {["Firma", "Sucht", "Ort", "Budget", "Bezug", "Status"].map((kopf) => (
              <th key={kopf} className="border-b border-line px-4 py-2.5 text-left text-xs font-medium text-ink-3">
                {kopf}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {anfragen.map((a) => {
            // anfragen_sichtbar ist eine View: PostgREST/supabase-gen typisiert alle
            // Spalten als nullable, obwohl id/letzter_kontakt/vertraulich in der
            // Basistabelle NOT NULL sind (siehe supabase/migrations/20260922195659_rls.sql).
            // Eine Zeile ohne id oder letzter_kontakt kann es also praktisch nicht geben --
            // wir überspringen sie defensiv statt sie mit `!`/`as` wegzucasten.
            if (a.id === null || a.letzter_kontakt === null) return null
            const id = a.id
            const letzterKontakt = a.letzter_kontakt
            const tage = Math.floor((Date.now() - new Date(letzterKontakt).getTime()) / 86_400_000)
            const wert = puls(new Date(letzterKontakt))
            // Ein Klick direkt auf eine ?-Lücke öffnet den Drawer sofort im
            // Bearbeiten-Modus (README-Anforderung); ein Klick auf die Zeile
            // sonst nur zur Ansicht. stopPropagation auf dem ?-Button verhindert,
            // dass der Zeilen-Handler zusätzlich mit bearbeitenSofort=false feuert.
            // Ein <button> statt eines <span onClick>, damit die Lücke auch per
            // Tastatur (Enter/Leertaste) erreichbar und für Screenreader als
            // Aktion erkennbar ist, statt ein stummes "?" zu sein.
            const luecke = (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onZeileWahl(id, true)
                }}
                aria-label="Fehlendes Feld ergänzen"
                className="font-display text-base font-bold text-warn"
              >
                ?
              </button>
            )
            return (
              <tr
                key={id}
                onClick={() => onZeileWahl(id, false)}
                className="cursor-pointer border-b border-line last:border-b-0 hover:bg-surface-2"
              >
                <td className="px-4 py-2.5 text-sm font-medium text-ink">
                  <div className="flex items-center gap-2">
                    {a.firma?.name ?? (a.vertraulich ? "—" : luecke)}
                    {a.vertraulich && (
                      <span className="rounded border border-line-2 px-1 text-[11px] font-normal text-ink-3">
                        vertraulich
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-2.5 text-sm text-ink-2">
                  {a.flaeche_min ?? "?"}–{a.flaeche_max ?? "?"} m²
                </td>
                <td className="px-4 py-2.5 text-sm text-ink-2">
                  {a.ort ? (
                    <a
                      href={mapsLink(a.ort)}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-brand hover:underline"
                    >
                      {a.ort} ↗
                    </a>
                  ) : (
                    luecke
                  )}
                </td>
                <td className="px-4 py-2.5 text-sm text-ink-2">
                  {a.budget_pro_m2 !== null ? `CHF ${a.budget_pro_m2}/m²` : luecke}
                </td>
                <td className="px-4 py-2.5 text-sm text-ink-2">{a.bezug ?? luecke}</td>
                <td className="px-4 py-2.5 text-sm">
                  <Chip kind={pulsFarbe(wert)}>{tage > 20 ? `${tage} Tage` : "aktuell"}</Chip>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
