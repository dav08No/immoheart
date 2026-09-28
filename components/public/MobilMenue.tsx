"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Menu } from "lucide-react"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/shadcn/sheet"
import { Button } from "@/components/shadcn/button"
import { cn } from "@/lib/utils"
import { NAV_LINKS } from "./HauptNavigation"

// Menü-Knopf unter md: öffnet ein shadcn-Sheet mit denselben Links wie die
// Desktop-Navigation; schließt sich, sobald eine Seite gewählt wird.
export function MobilMenue() {
  const [offen, setOffen] = useState(false)
  const pfad = usePathname()

  return (
    <Sheet open={offen} onOpenChange={setOffen}>
      <SheetTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Menü öffnen"
          aria-expanded={offen}
          className="md:hidden"
        >
          <Menu className="size-5" aria-hidden />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-72">
        <SheetHeader>
          <SheetTitle>Navigation</SheetTitle>
        </SheetHeader>
        <nav aria-label="Hauptnavigation" className="flex flex-col gap-1 px-4">
          {NAV_LINKS.map((link) => {
            const aktiv = link.href !== "/#kontakt" && pfad === link.href
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={aktiv ? "page" : undefined}
                onClick={() => setOffen(false)}
                className={cn(
                  "rounded-md px-3 py-2 text-base font-medium hover:bg-surface-2",
                  aktiv ? "text-ink" : "text-ink-2"
                )}
              >
                {link.label}
              </Link>
            )
          })}
          <Link
            href="/login"
            onClick={() => setOffen(false)}
            className="mt-2 rounded-md border border-line-2 px-3 py-2 text-center text-base font-medium text-ink hover:bg-surface-2"
          >
            Login
          </Link>
        </nav>
      </SheetContent>
    </Sheet>
  )
}
