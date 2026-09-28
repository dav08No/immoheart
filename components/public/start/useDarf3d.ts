"use client"

import { useEffect, useState } from "react"
import { darf3d } from "./darf3d"

function hatWebgl(): boolean {
  try {
    const canvas = document.createElement("canvas")
    const gl = canvas.getContext("webgl2") ?? canvas.getContext("webgl")
    // Test-Kontext sofort freigeben: Browser erlauben nur wenige gleichzeitig.
    gl?.getExtension("WEBGL_lose_context")?.loseContext()
    return gl !== null
  } catch {
    return false
  }
}

// Startet mit false (Server-HTML und erstes Rendern zeigen immer den Fallback) und
// prüft erst nach dem Mount; reagiert auf spätere Änderung von reduzierter Bewegung.
export function useDarf3d(): boolean {
  const [darf, setDarf] = useState(false)

  useEffect(() => {
    const bewegung = window.matchMedia("(prefers-reduced-motion: reduce)")
    const webgl = hatWebgl()
    const pruefen = () =>
      setDarf(
        darf3d({
          reduzierteBewegung: bewegung.matches,
          webgl,
          kerne: navigator.hardwareConcurrency || undefined,
          speicherGb: (navigator as { deviceMemory?: number }).deviceMemory,
          breite: window.innerWidth,
        })
      )
    pruefen()
    bewegung.addEventListener("change", pruefen)
    return () => bewegung.removeEventListener("change", pruefen)
  }, [])

  return darf
}
