"use client"

import { useState } from "react"
import { Menu } from "lucide-react"
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/shadcn/sheet"
import { Button } from "@/components/shadcn/button"
import { hatMenuePunkt } from "@/lib/mobil-ansicht"
import { useAdminNav } from "./AdminNavKontext"
import { SidebarInhalt } from "./Sidebar"

// Menü-Knopf im Seitenkopf unter lg: öffnet die Seitenleiste als Sheet von links
// (gleiches Muster wie MobilMenue der Website) und schliesst bei Navigation.
export function MobilLeiste() {
  const [offen, setOffen] = useState(false)
  const nav = useAdminNav()
  if (!nav) return null
  const punkt = hatMenuePunkt(nav.postfachAnzahl, nav.entwurfAnzahl)

  return (
    <Sheet open={offen} onOpenChange={setOffen}>
      <SheetTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={punkt ? "Menü öffnen (neue Mails oder offene Entwürfe)" : "Menü öffnen"}
          aria-expanded={offen}
          className="relative -ml-1.5 flex-none lg:hidden"
        >
          <Menu className="size-5" aria-hidden />
          {/* key = herzschlagNr: bei neuen Mails neu einhängen, damit der Punkt auch auf dem Handy sichtbar schlägt. */}
          {punkt && (
            <span
              key={nav.herzschlagNr}
              className={`absolute right-1.5 top-1.5 size-2 rounded-full bg-brand ring-2 ring-surface ${nav.herzschlagNr > 0 ? "animate-herzschlag-stark" : ""}`}
              aria-hidden
            />
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="left" aria-describedby={undefined} className="w-[260px] gap-0 bg-surface p-0 sm:max-w-[260px]">
        <SheetTitle className="sr-only">Admin-Navigation</SheetTitle>
        <SidebarInhalt onNavigation={() => setOffen(false)} />
      </SheetContent>
    </Sheet>
  )
}
