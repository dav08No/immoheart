// Zeitverlauf der CSS-Keyframes `herzschlag` (app/globals.css) als Funktion, damit
// das Korallen-Gebäude im selben Doppelschlag pulsiert wie die Knöpfe.

export const HERZSCHLAG_DAUER = 1.2

// [Anteil der Dauer, Skalierung] wie in @keyframes herzschlag.
const KEYFRAMES: [number, number][] = [
  [0, 1],
  [0.1, 1.18],
  [0.2, 1],
  [0.3, 1.12],
  [0.4, 1],
  [1, 1],
]

// Näherung an CSS `ease-in-out` zwischen zwei Keyframes.
function weich(t: number): number {
  return t * t * (3 - 2 * t)
}

export function herzschlagSkala(sekunden: number): number {
  const anteil = (((sekunden / HERZSCHLAG_DAUER) % 1) + 1) % 1
  for (let i = 1; i < KEYFRAMES.length; i++) {
    const [von, wertVon] = KEYFRAMES[i - 1] ?? [0, 1]
    const [bis, wertBis] = KEYFRAMES[i] ?? [1, 1]
    if (anteil <= bis) {
      return wertVon + (wertBis - wertVon) * weich((anteil - von) / (bis - von))
    }
  }
  return 1
}
