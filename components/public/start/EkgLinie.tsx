"use client"

import { useEffect, useRef, useState } from "react"
import { LazyMotion, domAnimation, m, useReducedMotion, useScroll, useSpring } from "motion/react"

// Flache Linie mit zwei Herzschlag-Ausschlägen (je Spur einer).
const PFAD =
  "M0 40 H260 L280 40 L292 12 L306 70 L318 28 L328 40 H860 L880 40 L892 12 L906 70 L918 28 L928 40 H1200"

const STRICH = {
  d: PFAD,
  fill: "none",
  className: "stroke-heart",
  strokeWidth: 3,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const

// Vor dem Mount (Server-HTML, ohne JS) und bei reduzierter Bewegung steht die Linie
// vollständig; erst danach zeichnet sie sich mit dem Scrollen.
export function EkgLinie() {
  const ref = useRef<HTMLDivElement>(null)
  const reduziert = useReducedMotion()
  const [bereit, setBereit] = useState(false)
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 90%", "end 40%"] })
  const laenge = useSpring(scrollYProgress, { stiffness: 120, damping: 30, restDelta: 0.001 })

  useEffect(() => setBereit(true), [])
  const zeichnen = bereit && !reduziert

  return (
    <div ref={ref} aria-hidden className="w-full">
      <svg viewBox="0 0 1200 80" className="h-auto w-full overflow-visible">
        <path d={PFAD} fill="none" className="stroke-line" strokeWidth={2} />
        {zeichnen ? (
          <LazyMotion features={domAnimation} strict>
            <m.path {...STRICH} style={{ pathLength: laenge }} />
          </LazyMotion>
        ) : (
          <path {...STRICH} />
        )}
      </svg>
    </div>
  )
}
