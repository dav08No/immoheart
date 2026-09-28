"use client"

import { useEffect, useState } from "react"
import type { PointerEvent, ReactNode } from "react"
import { LazyMotion, domAnimation, m, useMotionValue, useReducedMotion, useSpring } from "motion/react"

const MAX_GRAD = 6
const FEDER = { stiffness: 220, damping: 22 }

// Neigt die Karte zum Zeiger hin. Nur mit feinem Zeiger (Maus/Trackpad): auf
// Touch würde der Tilt beim Scrollen flackern. Tastaturfokus löst keine Pointer-
// Ereignisse aus und bleibt damit gerade.
export function TiltKarte({ children }: { children: ReactNode }) {
  const reduziert = useReducedMotion()
  const [feinerZeiger, setFeinerZeiger] = useState(false)
  const neigungX = useMotionValue(0)
  const neigungY = useMotionValue(0)
  const rotateX = useSpring(neigungX, FEDER)
  const rotateY = useSpring(neigungY, FEDER)

  useEffect(() => {
    const abfrage = window.matchMedia("(pointer: fine)")
    const aktualisieren = () => setFeinerZeiger(abfrage.matches)
    aktualisieren()
    abfrage.addEventListener("change", aktualisieren)
    return () => abfrage.removeEventListener("change", aktualisieren)
  }, [])

  const aktiv = feinerZeiger && !reduziert

  function bewegen(e: PointerEvent<HTMLDivElement>) {
    if (!aktiv || e.pointerType !== "mouse") return
    const rahmen = e.currentTarget.getBoundingClientRect()
    // -0.5 … 0.5 relativ zur Kartenmitte
    const rx = (e.clientX - rahmen.left) / rahmen.width - 0.5
    const ry = (e.clientY - rahmen.top) / rahmen.height - 0.5
    neigungY.set(rx * 2 * MAX_GRAD)
    neigungX.set(-ry * 2 * MAX_GRAD)
  }

  function zuruecksetzen() {
    neigungX.set(0)
    neigungY.set(0)
  }

  return (
    // LazyMotion + m statt motion: lädt nur die DOM-Animationsfeatures, kleineres Bundle.
    <LazyMotion features={domAnimation} strict>
      <m.div
        onPointerMove={bewegen}
        onPointerLeave={zuruecksetzen}
        style={aktiv ? { rotateX, rotateY, transformPerspective: 900 } : undefined}
        className="flex w-full"
      >
        {children}
      </m.div>
    </LazyMotion>
  )
}
