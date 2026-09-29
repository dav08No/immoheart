import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

type Props = { children: ReactNode; className?: string; ebene?: 2 | 3 }

// ink-2 statt ink-3: ink-3 erreicht auf surface nur 2.6:1, zu wenig für 11-px-Text.
// Ebene wählbar: auf Seiten ohne übergeordnetes h2 (z.B. Zahlen) gliedert der Titel
// direkt unter dem Seiten-h1 und muss deshalb h2 sein.
export function Abschnittstitel({ children, className, ebene = 3 }: Props) {
  const Titel = ebene === 2 ? "h2" : "h3"
  return <Titel className={cn("text-[11px] font-semibold uppercase tracking-wider text-ink-2", className)}>{children}</Titel>
}
