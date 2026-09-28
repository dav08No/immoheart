"use client"

import { useEffect, useState, type RefObject } from "react"

// Lag das Element beim Laden noch unterhalb des Sichtbereichs? Nur dann darf eine
// Einblend-Animation vom Server-Endzustand auf den Startzustand zurückspringen --
// der Sprung passiert dann ungesehen. Ist es schon im Bild (oder darüber), bleibt
// der Endzustand stehen statt kurz zu flackern. Vor dem Mount immer false (SSR).
export function useUnterhalbBeimLaden(ref: RefObject<Element | null>): boolean {
  const [unterhalb, setUnterhalb] = useState(false)
  useEffect(() => {
    const element = ref.current
    if (element) setUnterhalb(element.getBoundingClientRect().top >= window.innerHeight)
  }, [ref])
  return unterhalb
}
