import { CircleCheck, OctagonAlert, TriangleAlert, type LucideIcon } from "lucide-react"
import { formatZahl } from "@/lib/format"

// Statusfarben nur hier, wo sie Zustand bedeuten -- immer mit Icon und Wort, nie Farbe allein.
const STUFEN: { schluessel: "gut" | "warn" | "kritisch"; label: string; farbe: string; Icon: LucideIcon }[] = [
  { schluessel: "gut", label: "Gut", farbe: "var(--good)", Icon: CircleCheck },
  { schluessel: "warn", label: "Nachfassen", farbe: "var(--warn)", Icon: TriangleAlert },
  { schluessel: "kritisch", label: "Kritisch", farbe: "var(--crit)", Icon: OctagonAlert },
]

// Ein gestapelter Balken (Teil vom Ganzen) als reines HTML: kein Recharts nötig, jedes
// Segment trägt seinen Wert im title, die Legende darunter nennt alle Werte ausgeschrieben.
export function PulsBalken({ puls }: { puls: { gut: number; warn: number; kritisch: number } }) {
  const gesamt = puls.gut + puls.warn + puls.kritisch
  return (
    <div>
      <div className="flex h-6 w-full gap-0.5 overflow-hidden rounded" role="img" aria-label={STUFEN.map((s) => `${s.label}: ${puls[s.schluessel]}`).join(", ")}>
        {STUFEN.filter((s) => puls[s.schluessel] > 0).map((s) => (
          <div
            key={s.schluessel}
            title={`${s.label}: ${formatZahl(puls[s.schluessel])}`}
            className="h-full first:rounded-l last:rounded-r"
            style={{ width: `${(puls[s.schluessel] / gesamt) * 100}%`, background: s.farbe }}
          />
        ))}
      </div>
      <ul className="mt-3 grid gap-1.5 text-xs sm:grid-cols-3">
        {STUFEN.map(({ schluessel, label, farbe, Icon }) => (
          <li key={schluessel} className="flex items-center gap-1.5 text-ink-2">
            <Icon aria-hidden className="size-4 shrink-0" style={{ color: farbe }} />
            <span className="font-semibold text-ink">{formatZahl(puls[schluessel])}</span>
            {label}
          </li>
        ))}
      </ul>
    </div>
  )
}
