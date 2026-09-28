"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

export const NAV_LINKS = [
  { href: "/objekte", label: "Objekte" },
  { href: "/suchauftrag", label: "Suchauftrag" },
  { href: "/inserieren", label: "Inserieren" },
  { href: "/#kontakt", label: "Kontakt" },
] as const

// Eigene Client-Insel nur für die aktive Markierung: usePathname() braucht
// den Client, der Rest des Headers bleibt serverseitig gerendert.
export function HauptNavigation({ className }: { className?: string }) {
  const pfad = usePathname()

  return (
    <nav aria-label="Hauptnavigation" className={cn("flex items-center gap-1", className)}>
      {NAV_LINKS.map((link) => {
        const aktiv = link.href !== "/#kontakt" && pfad === link.href
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={aktiv ? "page" : undefined}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
              aktiv ? "text-ink" : "text-ink-2"
            )}
          >
            {link.label}
          </Link>
        )
      })}
    </nav>
  )
}
