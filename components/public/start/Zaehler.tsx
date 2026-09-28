"use client"

import { useEffect, useRef, useState } from "react"
import { useInView, useReducedMotion } from "motion/react"
import { formatZahl } from "@/components/public/objekte/anzeige"
import { useUnterhalbBeimLaden } from "./useUnterhalbBeimLaden"

const DAUER_MS = 1400

// Server und erster Client-Render zeigen den Endwert (SEO, ohne JS korrekt, keine
// Hydration-Differenz). Lag die Zahl beim Laden unterhalb des Sichtbereichs, springt sie
// ungesehen auf 0 und zählt beim Sichtbarwerden einmal hoch; sonst bleibt sie stehen.
// Eigene rAF-Schleife statt motion.animate: hält die Client-Insel klein.
export function Zaehler({ wert }: { wert: number }) {
  const ref = useRef<HTMLSpanElement>(null)
  const sichtbar = useInView(ref, { once: true, amount: 0.6 })
  const reduziert = useReducedMotion()
  const unterhalb = useUnterhalbBeimLaden(ref)
  const [anzeige, setAnzeige] = useState(wert)

  useEffect(() => {
    if (!unterhalb || reduziert) {
      setAnzeige(wert)
      return
    }
    if (!sichtbar) {
      setAnzeige(0)
      return
    }
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
  }, [unterhalb, sichtbar, reduziert, wert])

  return (
    <span ref={ref} className="tabular-nums">
      {formatZahl(anzeige)}
    </span>
  )
}
