"use client"

import { useEffect, useRef, useState } from "react"
import { useInView, useReducedMotion } from "motion/react"
import { formatZahl } from "@/components/public/objekte/anzeige"

const DAUER_MS = 1400

// Server und erster Client-Render zeigen den Endwert (SEO, ohne JS korrekt, keine
// Hydration-Differenz). Erst wenn die Zahl sichtbar wird, zählt sie einmal von 0 hoch.
// Eigene rAF-Schleife statt motion.animate: hält die Client-Insel klein.
export function Zaehler({ wert }: { wert: number }) {
  const ref = useRef<HTMLSpanElement>(null)
  const sichtbar = useInView(ref, { once: true, amount: 0.6 })
  const reduziert = useReducedMotion()
  const [anzeige, setAnzeige] = useState(wert)

  useEffect(() => {
    if (!sichtbar || reduziert) return
    const start = performance.now()
    let frame = requestAnimationFrame(function schritt(jetzt) {
      const t = Math.min(1, (jetzt - start) / DAUER_MS)
      const weich = 1 - Math.pow(1 - t, 3) // ease-out: am Ende langsam einrasten
      setAnzeige(Math.round(wert * weich))
      if (t < 1) frame = requestAnimationFrame(schritt)
    })
    // Abgebrochen (z.B. reduzierte Bewegung eingeschaltet) -> nie auf halbem Wert stehen bleiben.
    return () => {
      cancelAnimationFrame(frame)
      setAnzeige(wert)
    }
  }, [sichtbar, reduziert, wert])

  return (
    <span ref={ref} className="tabular-nums">
      {formatZahl(anzeige)}
    </span>
  )
}
