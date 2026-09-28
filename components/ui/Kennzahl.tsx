import type { ReactNode } from "react"
import type { StatusTon } from "@/lib/ui/status-ton"

const PUNKT: Record<StatusTon, string> = {
  gut: "bg-good",
  warn: "bg-warn",
  kritisch: "bg-crit",
  info: "bg-brand",
  neutral: "bg-ink-3",
}

// children optional: für Kacheln mit einer zusätzlichen Anzeige unter dem Text
// (z.B. der Speicher-Balken in SpeicherKachel) -- sonst müsste diese eine Kachel
// eine eigene, sonst identische Box nachbauen.
type Props = { label: string; wert: string | null; zusatz?: string; ton?: StatusTon; children?: ReactNode }

// Ohne Daten ein Strich + Hinweis, nie eine 0, die als Aussage gelesen würde (wie Kachel).
export function Kennzahl({ label, wert, zusatz, ton, children }: Props) {
  return (
    <div className="min-w-0 rounded-panel border border-line bg-surface p-4 shadow-panel">
      <div className="flex items-center gap-1.5 text-xs text-ink-2">
        {/* Punkt nur als Zusatz; die Aussage steht immer auch im Text. */}
        {ton && <span aria-hidden className={`size-2 shrink-0 rounded-full ${PUNKT[ton]}`} />}
        <span className="truncate" title={label}>
          {label}
        </span>
      </div>
      <div className="mt-1 font-display text-3xl font-semibold text-ink">{wert ?? "–"}</div>
      <div className="mt-0.5 text-xs text-ink-2">{wert === null ? "Noch keine Daten" : zusatz}</div>
      {children}
    </div>
  )
}
