import type { ReactNode } from "react"

// Stat-Kachel: Label, Wert, optionale Zusatzzeile. Ohne Daten ein Strich + Hinweis,
// nie eine 0, die als Aussage gelesen würde.
export function Kachel({ label, wert, zusatz, children }: { label: string; wert: string | null; zusatz?: string; children?: ReactNode }) {
  return (
    <div className="min-w-0 rounded-card border border-line bg-surface p-3.5">
      <div className="text-xs text-ink-3">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-ink">{wert ?? "–"}</div>
      <div className="mt-0.5 text-xs text-ink-3">{wert === null ? "Noch keine Daten" : zusatz}</div>
      {children}
    </div>
  )
}
