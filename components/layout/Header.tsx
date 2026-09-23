"use client"

import { useEffect, useState } from "react"

export function Header({ titel, untertitel }: { titel: string; untertitel?: string }) {
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
    <header className="flex h-14 flex-none items-center gap-3 border-b border-line bg-surface px-5">
      <h1 className="font-display text-lg font-bold text-ink">{titel}</h1>
      {untertitel && <span className="text-xs text-ink-3">{untertitel}</span>}
      <span className="flex-1" />
      <button
        onClick={umschalten}
        aria-label="Hell oder Dunkel"
        className="rounded-lg border border-line-2 px-2 py-1 text-xs text-ink-2 hover:bg-surface-2"
      >
        {dunkel ? "☾" : "☀"}
      </button>
    </header>
  )
}
