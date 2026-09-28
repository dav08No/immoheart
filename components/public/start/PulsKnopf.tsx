import Link from "next/link"
import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

type Props = { href: string; ton: "herz" | "petrol"; hauptsache?: boolean; children: ReactNode }

// Reine CSS-Animation (kein JS): der Ring pulsiert über box-shadow, bei reduzierter
// Bewegung schaltet globals.css die Animation ab und der Knopf bleibt statisch.
export function PulsKnopf({ href, ton, hauptsache = false, children }: Props) {
  return (
    <Link
      href={href}
      className={cn(
        "relative inline-flex h-11 items-center justify-center gap-2 rounded-full px-6 text-sm font-semibold outline-none focus-visible:ring-[3px] focus-visible:ring-on-hero/70 motion-safe:transition-colors",
        hauptsache
          ? "bg-surface text-brand hover:bg-surface-3"
          : "border border-on-hero/50 text-on-hero hover:bg-on-hero/10"
      )}
    >
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-0 animate-pulsring rounded-full",
          ton === "herz" ? "text-heart" : "text-brand-2"
        )}
      />
      {children}
    </Link>
  )
}
