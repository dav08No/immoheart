// `jetzt` als Parameter (Default new Date()) statt Date.now() direkt -- so bleibt puls()
// testbar und ist die Basis für pulsVerteilung() in lib/zahlen/verteilungen.ts, die für
// eine ganze Liste offener Anfragen einen festen Referenzzeitpunkt braucht.
export function puls(letzterKontakt: Date, jetzt: Date = new Date()): number {
  const tage = Math.floor((jetzt.getTime() - letzterKontakt.getTime()) / 86_400_000)
  return Math.max(4, 100 - tage)
}

export function pulsFarbe(wert: number): "gut" | "warn" | "kritisch" {
  if (wert >= 60) return "gut"
  if (wert >= 25) return "warn"
  return "kritisch"
}
