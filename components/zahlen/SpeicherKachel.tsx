import { formatBytes, speicherAnteil } from "@/lib/zahlen/speicher"
import { Kennzahl } from "@/components/ui/Kennzahl"

// Füllung trägt den Zustand (Marke -> Warnung -> kritisch), die Spur ist ein hellerer
// Schritt derselben Rampe, damit der Balken auch leer als Messgerät lesbar bleibt.
function fuellFarbe(anteil: number): string {
  if (anteil >= 0.95) return "var(--crit)"
  if (anteil >= 0.8) return "var(--warn)"
  return "var(--brand)"
}

export function SpeicherKachel({ buckets }: { buckets: { bucket: string; bytes: number }[] }) {
  const { belegt, anteil } = speicherAnteil(buckets)
  const prozent = Math.min(100, Math.round(anteil * 100))
  return (
    <Kennzahl label="Speicher belegt" wert={formatBytes(belegt)} zusatz={`${prozent} % von 1 GB`}>
      <div
        role="progressbar"
        aria-label="Speicher belegt"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={prozent}
        className="mt-2 h-2 w-full overflow-hidden rounded-full bg-brand-soft"
      >
        <div className="h-full rounded-full" style={{ width: `${Math.max(prozent, belegt > 0 ? 1 : 0)}%`, background: fuellFarbe(anteil) }} />
      </div>
    </Kennzahl>
  )
}
