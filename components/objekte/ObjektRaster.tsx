import { EyeOff } from "lucide-react"
import { Chip } from "@/components/ui/Chip"
import type { Database } from "@/types/database"

type ObjektRow = Database["public"]["Tables"]["objekte"]["Row"]
type ObjektStatus = Database["public"]["Enums"]["objekt_status_enum"]

function mapsLink(adresse: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(adresse)}`
}

const STATUS_LABEL: Record<ObjektStatus, string> = {
  verfuegbar: "Verfügbar",
  reserviert: "Reserviert",
  vermietet: "Vermietet",
}

const STATUS_CHIP_KIND: Record<ObjektStatus, "gut" | "warn" | "neutral"> = {
  verfuegbar: "gut",
  reserviert: "warn",
  vermietet: "neutral",
}

/**
 * `treffer[objektId]` wird hier als status='neu'-gefilterte Zählung erwartet
 * (nur aktionable, noch nicht bearbeitete Matches), NICHT als die rohe
 * Rückgabe von `zaehleMatchesFuerObjekt` (Task 54, lib/queries/objekte.ts),
 * die ungefiltert über alle match_status-Werte zählt (`neu`, `gesendet`,
 * `verworfen`). Ein Raster, das pro Objekt "12 Treffer" zeigt, obwohl 10
 * davon bereits gesendet oder verworfen sind, wäre für eine Vermittlerin,
 * die das Raster nach offenen Handlungsmöglichkeiten überfliegt, irreführend
 * -- die Zahl bliebe hoch (oder wüchse nur), selbst wenn längst nichts mehr
 * offen ist, und verliert damit ihren Signalwert als "hier gibt es etwas zu
 * tun"-Indikator.
 *
 * Diese Komponente bekommt nur die fertige Zählung als Prop (keine rohen
 * Match-Zeilen) und kann selbst nicht filtern. Der künftige Aufrufer
 * (voraussichtlich Task 58, `ObjekteAnsicht`) muss den `treffer`-Wert daher
 * bereits status='neu'-gefiltert liefern (z.B. via eine noch zu schreibende
 * `zaehleNeueMatchesFuerObjekt`-Query oder eine clientseitige Filterung der
 * Match-Zeilen), statt `zaehleMatchesFuerObjekt` direkt durchzureichen --
 * analog zu der Erwartung, die `AnfrageDetail` (Task 50) für `AnfragenAnsicht`
 * (Task 52) hinterlassen hat.
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
    <div className="grid grid-cols-[repeat(auto-fill,minmax(min(240px,100%),1fr))] gap-3.5">
      {objekte.map((o) => {
        // Ein Objekt bleibt nach Vermietung/Reservierung in dieser Liste (kein
        // eigener "nur verfügbar"-Filter hier -- das entscheidet der Aufrufer),
        // sieht aber ohne Unterscheidung identisch zu einem tatsächlich
        // verfügbaren Objekt aus. Sobald Status-Änderungen an Objekten möglich
        // sind (noch keine UI/kein Pfad dafür, siehe Task 54/55-Review), wäre
        // das im Raster nicht mehr harmlos: eine Vermittlerin könnte ein
        // bereits vermietetes Objekt für verfügbar halten. Deshalb schon jetzt
        // Chip + Abblendung nicht-verfügbarer Karten, obwohl `status` heute
        // praktisch immer `verfuegbar` ist.
        const nichtVerfuegbar = o.status !== "verfuegbar"
        // Hochgeladenes Titelbild vor der alten Foto-URL (Spalte bleibt als Fallback).
        const bild = titelbilder[o.id] ?? o.foto_url
        const anfragen = direktanfragen[o.id] ?? 0
        return (
          <article
            key={o.id}
            onClick={() => onKarteWahl(o.id)}
            className={`cursor-pointer overflow-hidden rounded-card border border-line bg-surface ${nichtVerfuegbar ? "opacity-70" : ""}`}
          >
            <div className="grid h-32 place-items-center bg-surface-3 text-xs text-ink-3">
              {bild ? (
                // eslint-disable-next-line @next/next/no-img-element -- Storage- oder freie URL, kein next/image-Loader konfiguriert
                <img src={bild} alt={o.titel} className="h-32 w-full object-cover" />
              ) : (
                "Foto"
              )}
            </div>
            <div className="p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-1.5 text-sm font-semibold text-ink">
                  {!o.oeffentlich && (
                    <EyeOff className="size-3.5 shrink-0 text-ink-3" role="img" aria-label="Nicht auf der Website" />
                  )}
                  <span className="truncate">{o.titel}</span>
                </div>
                <Chip kind={STATUS_CHIP_KIND[o.status]}>{STATUS_LABEL[o.status]}</Chip>
              </div>
              <div className="mt-0.5 text-xs text-ink-2">
                {o.flaeche} m² · {o.preis_pro_m2 !== null ? `CHF ${o.preis_pro_m2}/m²` : "auf Anfrage"}
              </div>
              <div className="mt-0.5 text-xs text-ink-2">{o.eigentuemer}</div>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs">
                <a
                  href={mapsLink(o.adresse)}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="text-brand hover:underline"
                >
                  Karte ↗
                </a>
                <span className="text-ink-3">{treffer[o.id] ?? 0} neue Treffer</span>
                <span className="text-ink-3">
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
