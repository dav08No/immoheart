import type { ReactNode } from "react"
import { Heart } from "lucide-react"
import { cn } from "@/lib/utils"

// Statt leerer Panels: ein Satz, kleines Markenherz, optional eine Aktion.
export function Leerzustand({ text, aktion, klein = false }: { text: string; aktion?: ReactNode; klein?: boolean }) {
  return (
    <div className={cn("flex flex-col items-center text-center", klein ? "gap-2 py-6" : "gap-3 py-12")}>
      <Heart aria-hidden className={cn("text-heart/60", klein ? "size-5" : "size-7")} />
      <p className="max-w-sm text-sm text-ink-2">{text}</p>
      {aktion}
    </div>
  )
}
