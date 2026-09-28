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

const EKG_DAUER_KRITISCH_MS = 1200
const EKG_DAUER_GESUND_MS = 3000

// Tempo der EKG-Linien-Animation in PulsHero: gesunder Bestand (wert nahe 100) schlägt
// ruhig (~3s pro Umlauf), kritischer Bestand (wert nahe 0) schlägt schnell (~1.2s) --
// linear dazwischen. Geklemmt, damit ein Wert ausserhalb [0, 100] die Animation nie
// schneller als "kritisch" oder langsamer als "gesund" macht.
export function pulsDauerMs(durchschnitt: number): number {
  const wert = Math.min(100, Math.max(0, durchschnitt))
  return Math.round(EKG_DAUER_KRITISCH_MS + (wert / 100) * (EKG_DAUER_GESUND_MS - EKG_DAUER_KRITISCH_MS))
}
