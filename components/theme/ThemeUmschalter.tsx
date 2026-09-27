"use client"

import { useEffect, useState } from "react"
import { Moon, Sun } from "lucide-react"
import { cn } from "@/lib/utils"

// Aus dem Admin-Header herausgelöst, damit auch der öffentliche Header
// denselben Umschalter (gleiches Verhalten, kein Theme-Flash) nutzen kann.
export function ThemeUmschalter({ className }: { className?: string }) {
  const [dunkel, setDunkel] = useState(false)

  useEffect(() => {
    // Der Server hat data-theme bereits korrekt aus dem Cookie gesetzt
    // (app/layout.tsx) -- dieser Effekt synchronisiert nur den lokalen
    // Button-Zustand mit dem, was tatsächlich schon gerendert wurde,
    // statt eine zweite, unabhängige Quelle (localStorage) zu lesen, die
    // mit dem Cookie auseinanderlaufen kann (z. B. Safari ITP kappt
    // Cookie-Lebensdauer auf 7 Tage, localStorage nicht) und den gerade
    // erst behobenen Theme-Flash wieder einführen würde.
    setDunkel(document.documentElement.dataset.theme === "dark")
  }, [])

  function umschalten() {
    const neu = !dunkel
    setDunkel(neu)
    document.documentElement.setAttribute("data-theme", neu ? "dark" : "light")
    document.cookie = `immoheart-theme=${neu ? "dark" : "light"}; path=/; max-age=31536000; samesite=lax`
  }

  return (
    <button
      onClick={umschalten}
      aria-label="Hell oder Dunkel"
      className={cn(
        "inline-flex items-center justify-center rounded-lg border border-line-2 p-1.5 text-ink-2 hover:bg-surface-2",
        className
      )}
    >
      {dunkel ? <Moon className="size-4" aria-hidden /> : <Sun className="size-4" aria-hidden />}
    </button>
  )
}
