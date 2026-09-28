import { Chip } from "@/components/ui/Chip"
import { puls, pulsFarbe } from "@/lib/puls"
import type { AnfrageMitFirma } from "@/lib/queries/anfragen"

function mapsLink(ort: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${ort}, Schweiz`)}`
}

const SPALTEN = ["Firma", "Status", "Sucht", "Ort", "Budget", "Bezug"]
// Firma bleibt beim seitlichen Scrollen stehen, damit jede Zeile zuordenbar bleibt.
const FIXIERT = "sticky left-0 z-[1] bg-surface"

export function AnfragenTabelle({
  anfragen,
  onZeileWahl,
}: {
  anfragen: AnfrageMitFirma[]
  onZeileWahl: (id: string, bearbeitenSofort: boolean) => void
}) {
  return (
    // Eigener Scroll-Container: auf dem Handy scrollt nur die Tabelle seitlich, nie die
    // Seite. Wichtigste Spalten zuerst (Firma fixiert, dann Status), der Rest folgt.
    <div className="overflow-x-auto rounded-card border border-line bg-surface">
      <table className="w-full min-w-[640px] border-collapse">
        <thead>
          <tr>
            {SPALTEN.map((kopf, i) => (
              <th
                key={kopf}
                className={`whitespace-nowrap border-b border-line px-4 py-2.5 text-left text-xs font-medium text-ink-3 ${
                  i === 0 ? FIXIERT : ""
                }`}
              >
                {kopf}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {anfragen.map((a) => {
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
                className="group cursor-pointer border-b border-line last:border-b-0 hover:bg-surface-2"
              >
                <td className={`max-w-44 px-4 py-2.5 text-sm font-medium text-ink wrap-break-word group-hover:bg-surface-2 ${FIXIERT}`}>
                  {a.firma?.name ?? luecke}
                </td>
                <td className="px-4 py-2.5 text-sm">
                  <Chip kind={pulsFarbe(wert)}>{tage > 20 ? `${tage} Tage` : "aktuell"}</Chip>
                </td>
                <td className="whitespace-nowrap px-4 py-2.5 text-sm text-ink-2">
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
                <td className="whitespace-nowrap px-4 py-2.5 text-sm text-ink-2">
                  {a.budget_pro_m2 !== null ? `CHF ${a.budget_pro_m2}/m²` : luecke}
                </td>
                <td className="px-4 py-2.5 text-sm text-ink-2">{a.bezug ?? luecke}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
