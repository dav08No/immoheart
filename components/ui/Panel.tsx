import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

type PanelProps = { children: ReactNode; className?: string; as?: "section" | "div" | "article"; polster?: boolean }

// Grundfläche aller Admin-Inhalte: eine Form statt vieler leicht abweichender Karten.
export function Panel({ children, className, as: Tag = "div", polster = true }: PanelProps) {
  return (
    <Tag className={cn("min-w-0 rounded-panel border border-line bg-surface shadow-panel", polster && "p-4 sm:p-5", className)}>
      {children}
    </Tag>
  )
}

type KopfProps = { titel: string; beschreibung?: string; aktionen?: ReactNode; ebene?: 2 | 3 }

export function PanelKopf({ titel, beschreibung, aktionen, ebene = 2 }: KopfProps) {
  // Ebene wählbar, damit die Überschriften-Hierarchie unter dem Seiten-h1 stimmt.
  const Titel = ebene === 2 ? "h2" : "h3"
  return (
    <div className="mb-4 flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
      <div className="min-w-0">
        <Titel className={cn("font-display font-semibold text-ink wrap-anywhere", ebene === 2 ? "text-lg" : "text-base")}>
          {titel}
        </Titel>
        {beschreibung && <p className="mt-0.5 text-sm text-ink-2 wrap-anywhere">{beschreibung}</p>}
      </div>
      {aktionen && <div className="flex flex-wrap items-center gap-2">{aktionen}</div>}
    </div>
  )
}
