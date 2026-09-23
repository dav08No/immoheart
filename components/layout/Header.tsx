"use client"

import { useEffect, useState } from "react"

export function Header({ titel, untertitel }: { titel: string; untertitel: string }) {
  const [dunkel, setDunkel] = useState(false)

  useEffect(() => {
    const gespeichert = localStorage.getItem("puls-theme")
    if (gespeichert === "dark") {
      setDunkel(true)
      document.documentElement.setAttribute("data-theme", "dark")
    }
  }, [])

  function umschalten() {
    const neu = !dunkel
    setDunkel(neu)
    document.documentElement.setAttribute("data-theme", neu ? "dark" : "light")
    localStorage.setItem("puls-theme", neu ? "dark" : "light")
  }

  return (
    <header className="flex h-14 flex-none items-center gap-3 border-b border-line bg-surface px-5">
      <h1 className="font-display text-lg font-bold text-ink">{titel}</h1>
      <span className="text-xs text-ink-3">{untertitel}</span>
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
