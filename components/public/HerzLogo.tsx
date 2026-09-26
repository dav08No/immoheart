import { Heart } from "lucide-react"
import { cn } from "@/lib/utils"

export function HerzLogo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2 font-display text-xl font-bold text-ink", className)}>
      <Heart className="size-5 animate-herzschlag fill-heart text-heart" aria-hidden />
      immoheart
    </span>
  )
}
