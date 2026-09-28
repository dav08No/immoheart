"use client"
import { useReducedMotion } from "motion/react"

// Recharts animiert Marks standardmässig. Nur animieren, wenn sicher bekannt ist, dass
// keine reduzierte Bewegung gewünscht ist (null = noch unbekannt -> ruhig bleiben).
export function useAnimiert(): boolean {
  return useReducedMotion() === false
}
