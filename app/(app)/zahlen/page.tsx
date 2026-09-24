import { Header } from "@/components/layout/Header"
import { holeZahlenKennzahlen, holeErfolgsquoteVerlauf, holeFlaechenVerteilung } from "@/lib/queries/zahlen"

function liniendiagramm(daten: { monat: string; prozent: number }[]): string {
  if (daten.length === 0) return ""
  const W = 480, H = 180, L = 32, R = 12, T = 12, B = 26
  const iw = W - L - R, ih = H - T - B, max = 100
  const x = (i: number) => L + (i / Math.max(1, daten.length - 1)) * iw
  const y = (v: number) => T + ih - (v / max) * ih
  return daten.map((d, i) => `${x(i).toFixed(1)},${y(d.prozent).toFixed(1)}`).join(" ")
}

// Flache Mittellinie fürs Liniendiagramm im Leerzustand -- dieselbe Koordinatenbasis
// wie liniendiagramm(), damit sie exakt in den Chart-Bereich (T..T+ih) passt.
function mittellinie(): string {
  const W = 480, T = 12, B = 26, H = 180
  const y = T + (H - T - B) / 2
  return `M32,${y} L${W - 12},${y}`
}

export default async function ZahlenPage() {
  // Keine try/catch hier: ZahlenPage ist eine reine Server-Component ohne
  // Nutzerinteraktion, ein Fehler beim Laden (z. B. Netzwerkausfall) wird
  // bereits von app/(app)/error.tsx abgefangen (Next.js Error-Boundary für
  // Fehler, die während des Server-Renderns eines Segments geworfen werden) --
  // ein lokaler try/catch mit eigenem Fehlerbanner wäre hier nur eine zweite,
  // redundante Fehleroberfläche für denselben Fall.
  const [kennzahlen, verlauf, verteilung] = await Promise.all([
    holeZahlenKennzahlen(),
    holeErfolgsquoteVerlauf(),
    holeFlaechenVerteilung(),
  ])
  const punkte = liniendiagramm(verlauf)
  const maxAnzahl = Math.max(1, ...verteilung.map((v) => v.anzahl))

  // holeZahlenKennzahlen/holeErfolgsquoteVerlauf/holeFlaechenVerteilung lesen alle
  // dieselbe(n) rollen­eingeschränkte(n) Basistabelle(n) (siehe Kommentar in
  // lib/queries/zahlen.ts) -- für eine Rolle ohne Zugriff (leser) liefert
  // holeErfolgsquoteVerlauf() eine leere Liste, weil sie ungefiltert auf `anfragen`
  // liest. Ein leeres verlauf bedeutet damit zuverlässig: auch erfolgsquoteProzent
  // (aus derselben Abfragegrundlage) ist nur der Rechenfallback 0 statt eines echten
  // Werts, bisErstangebotTage ist zwangsläufig null (nachrichten-Join auf dieselbe
  // Basistabelle), und verteilung (Teilmenge derselben Zeilen) ist zwangsläufig
  // ebenfalls überall 0. Ein einziges Signal reicht daher für alle vier Kacheln und
  // beide Diagramme -- nacharbeitProTagMinuten/freigabequoteProzent sind (noch)
  // feste Platzhalterwerte ohne Datenbankbezug (siehe lib/queries/zahlen.ts) und
  // bleiben deshalb unabhängig von hatDaten unverändert sichtbar.
  const hatDaten = verlauf.length > 0

  return (
    <>
      <Header titel="Zahlen" untertitel={new Date().getFullYear().toString()} />
      <main className="flex-1 overflow-y-auto p-5">
        <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-3">
          <div className="rounded-card border border-line bg-surface p-3.5">
            <div className="text-xs text-ink-3">Bis Erstangebot{!hatDaten && " · keine Daten"}</div>
            <div className="font-display text-2xl font-bold text-ink">
              {kennzahlen.bisErstangebotTage ?? "–"}{" "}
              {kennzahlen.bisErstangebotTage !== null && <span className="text-sm text-ink-3">Tage</span>}
            </div>
          </div>
          <div className="rounded-card border border-line bg-surface p-3.5">
            <div className="text-xs text-ink-3">Erfolgsquote{!hatDaten && " · keine Daten"}</div>
            <div className="font-display text-2xl font-bold text-ink">
              {hatDaten ? kennzahlen.erfolgsquoteProzent : "–"}{" "}
              {hatDaten && <span className="text-sm text-ink-3">%</span>}
            </div>
          </div>
          <div className="rounded-card border border-line bg-surface p-3.5">
            <div className="text-xs text-ink-3">Nacharbeit / Tag</div>
            <div className="font-display text-2xl font-bold text-ink">
              {kennzahlen.nacharbeitProTagMinuten} <span className="text-sm text-ink-3">Min.</span>
            </div>
          </div>
          <div className="rounded-card border border-line bg-surface p-3.5">
            <div className="text-xs text-ink-3">Freigabequote</div>
            <div className="font-display text-2xl font-bold text-ink">
              {kennzahlen.freigabequoteProzent} <span className="text-sm text-ink-3">%</span>
            </div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-3.5">
          <div className="rounded-card border border-line bg-surface p-3.5">
            <h2 className="mb-2 font-display text-sm font-bold text-ink">
              Erfolgsquote{!hatDaten && <span className="font-normal text-ink-3"> · keine Daten</span>}
            </h2>
            <svg
              viewBox="0 0 480 180"
              className="h-auto w-full"
              role="img"
              aria-label={hatDaten ? "Erfolgsquote über die Monate" : "Erfolgsquote über die Monate, keine Daten sichtbar"}
            >
              {hatDaten ? (
                <polyline points={punkte} fill="none" stroke="var(--brand)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              ) : (
                <path d={mittellinie()} fill="none" stroke="var(--ink-3)" strokeWidth="2" strokeDasharray="4 4" />
              )}
            </svg>
          </div>
          <div className="rounded-card border border-line bg-surface p-3.5">
            <h2 className="mb-2 font-display text-sm font-bold text-ink">
              Gesuchte Grössen{!hatDaten && <span className="font-normal text-ink-3"> · keine Daten</span>}
            </h2>
            {hatDaten ? (
              verteilung.map((v) => (
                <div key={v.bereich} className="grid grid-cols-[92px_1fr_28px] items-center gap-2.5 py-1 text-xs">
                  <span className="text-right text-ink-2">{v.bereich}</span>
                  <span className="h-3.5 overflow-hidden rounded-r bg-surface-2">
                    <span className="block h-full rounded-r bg-brand" style={{ width: `${(v.anzahl / maxAnzahl) * 100}%` }} />
                  </span>
                  <span className="text-ink-2">{v.anzahl}</span>
                </div>
              ))
            ) : (
              <p className="py-6 text-center text-xs text-ink-3">Keine Daten sichtbar</p>
            )}
          </div>
        </div>
      </main>
    </>
  )
}
