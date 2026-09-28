import type { ReactNode } from "react"
import type { StatusTon } from "@/lib/ui/status-ton"

export type { StatusTon }

// Nur Token-Paare mit >= 4.5:1 in Hell und Dunkel (info: Petrol auf brand-soft).
const TON_KLASSEN: Record<StatusTon, string> = {
  gut: "bg-good-bg text-good",
  warn: "bg-warn-bg text-warn",
  kritisch: "bg-crit-bg text-crit",
  info: "bg-brand-soft text-brand",
  neutral: "bg-surface-3 text-ink-2",
}

export function StatusChip({ ton = "neutral", children, icon }: { ton?: StatusTon; children: ReactNode; icon?: ReactNode }) {
  return (
    <span
      className={`inline-flex max-w-full items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium [&_svg]:size-3 [&_svg]:shrink-0 ${TON_KLASSEN[ton]}`}
    >
      {icon}
      {/* Lange Werte (Kategorien, Objektnamen) kürzen statt die Zeile zu sprengen. */}
      <span className="truncate">{children}</span>
    </span>
  )
}
