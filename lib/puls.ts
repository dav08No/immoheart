export function puls(letzterKontakt: Date): number {
  const tage = Math.floor((Date.now() - letzterKontakt.getTime()) / 86_400_000)
  return Math.max(4, 100 - tage)
}

export function pulsFarbe(wert: number): "gut" | "warn" | "kritisch" {
  if (wert >= 60) return "gut"
  if (wert >= 25) return "warn"
  return "kritisch"
}
