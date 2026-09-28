// Reine Entscheidung, ob das WebGL-Stadtmodell geladen werden darf -- getrennt
// vom Browser-Auslesen (useDarf3d), damit sie ohne DOM testbar ist.

export type Geraet = {
  reduzierteBewegung: boolean
  webgl: boolean
  /** navigator.hardwareConcurrency, falls bekannt */
  kerne?: number
  /** navigator.deviceMemory (nur Chromium), falls bekannt */
  speicherGb?: number
  /** Viewport-Breite in px */
  breite: number
}

const MIN_BREITE = 360

export function darf3d({ reduzierteBewegung, webgl, kerne, speicherGb, breite }: Geraet): boolean {
  if (reduzierteBewegung || !webgl) return false
  // Schwache Geräte behalten das statische Bild: 3D würde dort ruckeln und Akku kosten.
  if (kerne !== undefined && kerne <= 2) return false
  if (speicherGb !== undefined && speicherGb <= 2) return false
  return breite >= MIN_BREITE
}
