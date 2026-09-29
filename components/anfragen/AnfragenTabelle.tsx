import { StatusChip } from "@/components/ui/StatusChip"
import { Tabelle } from "@/components/ui/Tabelle"
import { puls, pulsFarbe } from "@/lib/puls"
import { anfrageStatusTon } from "@/lib/ui/status-ton"
import type { AnfrageMitFirma } from "@/lib/queries/anfragen"
import { ANFRAGE_STATUS_LABEL } from "./typen"

function mapsLink(ort: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${ort}, Schweiz`)}`
}

const SPALTEN = ["Firma", "Status", "Sucht", "Ort", "Budget", "Bezug"]
// Firma bleibt beim seitlichen Scrollen stehen, damit jede Zeile zuordenbar bleibt --
// auf jeder Breite (die Tabelle ist min. 640 px breit, also auch auf Tablets scrollbar),
// nicht nur unter sm wie die Tabelle-Grundregel.
const FIXIERT = "sticky left-0 z-[1] bg-surface"

const PUNKT: Record<ReturnType<typeof pulsFarbe>, string> = { gut: "bg-good", warn: "bg-warn", kritisch: "bg-crit" }
const PULS_TEXT: Record<ReturnType<typeof pulsFarbe>, string> = { gut: "gut", warn: "nachfassen", kritisch: "kritisch" }

export function AnfragenTabelle({
  anfragen,
  onZeileWahl,
}: {
  anfragen: AnfrageMitFirma[]
  onZeileWahl: (id: string, bearbeitenSofort: boolean) => void
}) {
  return (
    <Tabelle ariaLabel="Anfragen" minBreite="min-w-[640px]">
      <thead>
        <tr>
          {SPALTEN.map((kopf, i) => (
            <th key={kopf} className={`whitespace-nowrap ${i === 0 ? FIXIERT : ""}`}>
              {kopf}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="[&_td]:text-ink-2">
        {anfragen.map((a) => {
          const id = a.id
          const letzterKontakt = a.letzter_kontakt
          const tage = Math.floor((Date.now() - new Date(letzterKontakt).getTime()) / 86_400_000)
          const farbe = pulsFarbe(puls(new Date(letzterKontakt)))
          // Ein Klick direkt auf eine ?-Lücke öffnet den Drawer sofort im Bearbeiten-Modus
          // (README-Anforderung), ein Klick auf die Zeile sonst nur zur Ansicht.
          // stopPropagation verhindert, dass der Zeilen-Handler zusätzlich feuert; <button>,
          // damit die Lücke per Tastatur erreichbar und für Screenreader eine Aktion ist.
          const luecke = (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onZeileWahl(id, true)
              }}
              aria-label="Fehlendes Feld ergänzen"
              className="rounded font-display text-base font-bold text-warn outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              ?
            </button>
          )
          return (
            <tr key={id} onClick={() => onZeileWahl(id, false)} className="group cursor-pointer">
              <td className={`max-w-44 font-medium wrap-break-word group-hover:bg-surface-2 ${FIXIERT}`}>
                {a.firma?.name ? (
                  // Echter Knopf, damit die Zeile auch per Tastatur geöffnet werden kann.
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      onZeileWahl(id, false)
                    }}
                    className="rounded text-left text-ink outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {a.firma.name}
                  </button>
                ) : (
                  luecke
                )}
              </td>
              <td>
                <div className="flex flex-col items-start gap-1">
                  <StatusChip ton={anfrageStatusTon(a.status)}>{ANFRAGE_STATUS_LABEL[a.status]}</StatusChip>
                  <span className="flex items-center gap-1.5 whitespace-nowrap text-xs" title={`Puls ${PULS_TEXT[farbe]}`}>
                    <span aria-hidden className={`size-2 shrink-0 rounded-full ${PUNKT[farbe]}`} />
                    <span className="sr-only">Puls {PULS_TEXT[farbe]}: </span>
                    {tage > 20 ? `${tage} Tage` : "aktuell"}
                  </span>
                </div>
              </td>
              <td className="whitespace-nowrap">
                {a.flaeche_min ?? "?"}–{a.flaeche_max ?? "?"} m²
              </td>
              <td>
                {a.ort ? (
                  <a
                    href={mapsLink(a.ort)}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="rounded text-brand outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {a.ort} ↗
                  </a>
                ) : (
                  luecke
                )}
              </td>
              <td className="whitespace-nowrap">{a.budget_pro_m2 !== null ? `CHF ${a.budget_pro_m2}/m²` : luecke}</td>
              <td>{a.bezug ?? luecke}</td>
            </tr>
          )
        })}
      </tbody>
    </Tabelle>
  )
}
