// Gemeinsame Anordnung für SVG-Fallback und WebGL-Szene, damit beide dasselbe
// Stadtbild zeigen und das Überblenden nicht springt.

export type Bau = { x: number; y: number; b: number; t: number; h: number; herz?: boolean }

// Raster-Koordinaten (x nach rechts unten, y nach links unten), Breite b, Tiefe t, Höhe h.
export const BAUTEN: Bau[] = [
  { x: 0, y: 0, b: 2, t: 2, h: 5 },
  { x: 3, y: 0, b: 2, t: 1.5, h: 3 },
  { x: 6, y: 0, b: 1.5, t: 2, h: 6.5 },
  { x: 0, y: 3, b: 1.5, t: 2, h: 3.5 },
  { x: 3, y: 2.5, b: 2, t: 2, h: 4.5, herz: true },
  { x: 6, y: 3, b: 2, t: 1.5, h: 2.5 },
  { x: 0, y: 6, b: 2.5, t: 1.5, h: 2 },
  { x: 3.5, y: 5.5, b: 1.5, t: 1.5, h: 5.5 },
  { x: 6, y: 5.5, b: 2, t: 2, h: 3.5 },
]

// EKG entlang der vorderen Kante (y = EKG_Y), ein Ausschlag vor dem Korallen-Bau:
// [x, Ausschlag].
export const EKG_Y = 8.3
export const EKG_PUNKTE: [number, number][] = [
  [-0.5, 0], [2.5, 0], [3, 0.6], [3.4, -1.6], [3.8, 1.2], [4.2, 0], [9, 0],
]
