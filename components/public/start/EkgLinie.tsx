"use client"

import { useRef } from "react"
import { LazyMotion, domAnimation, m, useReducedMotion, useScroll, useSpring } from "motion/react"
import { useUnterhalbBeimLaden } from "./useUnterhalbBeimLaden"

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

// Vor dem Mount (Server-HTML, ohne JS), bei reduzierter Bewegung und wenn sie beim Laden
// schon im Bild war, steht die Linie vollständig (kein Flackern); sonst zeichnet sie
// sich beim Hereinscrollen.
export function EkgLinie() {
  const ref = useRef<HTMLDivElement>(null)
  const reduziert = useReducedMotion()
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 90%", "end 40%"] })
  const laenge = useSpring(scrollYProgress, { stiffness: 120, damping: 30, restDelta: 0.001 })

  const zeichnen = useUnterhalbBeimLaden(ref) && !reduziert

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
