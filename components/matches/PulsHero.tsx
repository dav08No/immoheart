import { Kennzahl } from "@/components/ui/Kennzahl"
import { formatZahl } from "@/lib/format"
import { pulsTon } from "@/lib/ui/status-ton"
import { puls, pulsDauerMs, pulsFarbe } from "@/lib/puls"

function ekgPfad(w: number, h: number, wert: number, beats: number): string {
  const mid = h / 2
  const amp = Math.max(2, (wert / 100) * (h * 0.4))
  const seg = w / beats
  let d = `M0 ${mid}`
  for (let i = 0; i < beats; i++) {
    const x = i * seg
    d += ` L${(x + seg * 0.3).toFixed(1)} ${mid}`
    d += ` L${(x + seg * 0.36).toFixed(1)} ${(mid + amp * 0.22).toFixed(1)}`
    d += ` L${(x + seg * 0.44).toFixed(1)} ${(mid - amp).toFixed(1)}`
    d += ` L${(x + seg * 0.52).toFixed(1)} ${(mid + amp * 0.55).toFixed(1)}`
    d += ` L${(x + seg * 0.6).toFixed(1)} ${mid}`
    d += ` L${(x + seg).toFixed(1)} ${mid}`
  }
  return d
}

const FARBE_VAR: Record<ReturnType<typeof pulsFarbe>, string> = {
  gut: "var(--good)", warn: "var(--warn)", kritisch: "var(--crit)",
}

export function PulsHero({ letzteKontakte }: { letzteKontakte: Date[] }) {
  const werte = letzteKontakte.map((d) => puls(d))
  // Ohne offene Anfragen gibt es keinen Puls -- eigener Leerzustand statt einer 0,
  // die als "alles kritisch" gelesen würde.
  const hatDaten = werte.length > 0
  const durchschnitt = hatDaten ? Math.round(werte.reduce((s, v) => s + v, 0) / werte.length) : 0
  const frisch = werte.filter((w) => w >= 60).length
  const altert = werte.filter((w) => w >= 25 && w < 60).length
  const kritisch = werte.filter((w) => w < 25).length
  const farbe = hatDaten ? FARBE_VAR[pulsFarbe(durchschnitt)] : "var(--ink-3)"
  const W = 1000
  const H = 72
  const pfad = hatDaten ? ekgPfad(W, H, durchschnitt, 9) : `M0 ${H / 2} L${W} ${H / 2}`
  // Gesund = ruhiger Umlauf, kritisch = schneller (lib/puls.ts) -- als Inline-Style statt
  // Tailwind-Klasse, weil der Wert pro Render/Instanz unterschiedlich ist.
  const ekgDauerMs = pulsDauerMs(durchschnitt)

  // Kein eigener Rahmen mehr: der Aufrufer (MatchesAnsicht) steckt PulsHero in ein
  // Panel mit PanelKopf "Bestandspuls" -- die Überschrift ist damit nicht mehr doppelt.
  return (
    <div>
      <div className="flex items-center gap-2">
        <div className="font-display text-4xl font-bold" style={{ color: farbe }}>
          {hatDaten ? durchschnitt : "–"}
        </div>
        {hatDaten ? (
          // Live-Punkt: reine CSS-Animation (pulsring, bereits reduced-motion-fest),
          // eingefärbt über currentColor.
          <span className="relative inline-flex size-2.5 shrink-0" style={{ color: farbe }} aria-hidden>
            <span className="absolute inset-0 animate-pulsring rounded-full" />
            <span className="size-2.5 rounded-full" style={{ background: "currentColor" }} />
          </span>
        ) : (
          <span className="text-xs text-ink-2">Keine Daten</span>
        )}
      </div>
      <div className="-mx-4 mt-3 h-[72px] sm:-mx-5">
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="block h-[72px] w-full" aria-hidden="true">
          <path d={`M0 ${H / 2} L${W} ${H / 2}`} stroke="var(--line)" strokeWidth="1" fill="none" />
          {hatDaten && (
            <>
              <path d={pfad} fill="none" stroke={farbe} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity={0.26} />
              {/* Reine CSS-Animation statt SMIL <animate>: nur so lässt sich die Dauer per
                  Inline-Style setzen und über die globale prefers-reduced-motion-Regel
                  (app/globals.css) abschalten -- SMIL ignoriert diese Media Query. */}
              <path
                d={pfad} fill="none" stroke={farbe} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"
                strokeDasharray="150 3000" strokeDashoffset="150"
                className="animate-ekg-lauf" style={{ animationDuration: `${ekgDauerMs}ms` }}
              />
            </>
          )}
        </svg>
      </div>
      {/* Unter 400 px untereinander: drei Kacheln nebeneinander wären bei 360 px zu schmal. */}
      <div className="mt-4 grid grid-cols-1 gap-3 min-[400px]:grid-cols-3">
        <Kennzahl label="Gut" wert={formatZahl(frisch)} ton={pulsTon("gut")} />
        <Kennzahl label="Nachfassen" wert={formatZahl(altert)} ton={pulsTon("warn")} />
        <Kennzahl label="Kritisch" wert={formatZahl(kritisch)} ton={pulsTon("kritisch")} />
      </div>
    </div>
  )
}
