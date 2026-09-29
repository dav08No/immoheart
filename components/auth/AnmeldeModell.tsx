"use client"

import { useEffect, useState } from "react"
import { HeroVisual } from "@/components/public/start/HeroVisual"

// Das Stadtmodell erst ab lg einhängen: nur per CSS versteckt würde das Handy
// trotzdem den three-Chunk laden.
export function AnmeldeModell() {
  const [breit, setBreit] = useState(false)

  useEffect(() => {
    const abfrage = window.matchMedia("(min-width: 1024px)")
    const pruefen = () => setBreit(abfrage.matches)
    pruefen()
    abfrage.addEventListener("change", pruefen)
    return () => abfrage.removeEventListener("change", pruefen)
  }, [])

  if (!breit) return null
  return (
    <div className="w-full max-w-sm">
      <HeroVisual />
    </div>
  )
}
