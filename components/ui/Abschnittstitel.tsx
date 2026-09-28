import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

// ink-2 statt ink-3: ink-3 erreicht auf surface nur 2.6:1, zu wenig für 11-px-Text.
export function Abschnittstitel({ children, className }: { children: ReactNode; className?: string }) {
  return <h3 className={cn("text-[11px] font-semibold uppercase tracking-wider text-ink-2", className)}>{children}</h3>
}
