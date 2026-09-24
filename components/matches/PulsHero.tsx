import { puls, pulsFarbe } from "@/lib/puls"

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
  // Kein Kontakt sichtbar (z. B. Rolle "leser", siehe holeOffenePulsWerte) ist kein Puls von 0 —
  // 0 läge unterhalb des von puls() je erreichbaren Bereichs (min. 4) und würde als "alles kritisch"
  // statt als "keine Daten für diese Rolle" gelesen. Deshalb eigener neutraler Leerzustand.
  const hatDaten = werte.length > 0
  const durchschnitt = hatDaten ? Math.round(werte.reduce((s, v) => s + v, 0) / werte.length) : 0
  const frisch = werte.filter((w) => w >= 60).length
  const altert = werte.filter((w) => w >= 25 && w < 60).length
  const kritisch = werte.filter((w) => w < 25).length
  const farbe = hatDaten ? FARBE_VAR[pulsFarbe(durchschnitt)] : "var(--ink-3)"
  const W = 1000
  const H = 72
  const pfad = hatDaten ? ekgPfad(W, H, durchschnitt, 9) : `M0 ${H / 2} L${W} ${H / 2}`

  return (
    <div className="overflow-hidden rounded-card border border-line bg-surface p-4">
      <div className="flex flex-wrap items-end gap-5">
        <div>
          <div className="font-display text-4xl font-bold" style={{ color: farbe }}>
            {hatDaten ? durchschnitt : "–"}
          </div>
          <div className="mt-0.5 text-xs text-ink-3">
            {hatDaten ? "Bestandspuls" : "Bestandspuls · keine Daten"}
          </div>
        </div>
        <div className="ml-auto flex gap-4">
          <div><b className="block font-display text-lg text-good">{frisch}</b><span className="text-xs text-ink-3">frisch</span></div>
          <div><b className="block font-display text-lg text-warn">{altert}</b><span className="text-xs text-ink-3">altert</span></div>
          <div><b className="block font-display text-lg text-crit">{kritisch}</b><span className="text-xs text-ink-3">kritisch</span></div>
        </div>
      </div>
      <div className="-mx-4 mt-2.5 h-[72px]">
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="block h-[72px] w-full" aria-hidden="true">
          <path d={`M0 ${H / 2} L${W} ${H / 2}`} stroke="var(--line)" strokeWidth="1" fill="none" />
          {hatDaten && (
            <>
              <path d={pfad} fill="none" stroke={farbe} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity={0.26} />
              <path
                d={pfad} fill="none" stroke={farbe} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"
                strokeDasharray="150 3000" strokeDashoffset="150"
              >
                <animate attributeName="stroke-dashoffset" from="150" to="-3000" dur="7s" repeatCount="indefinite" />
              </path>
            </>
          )}
        </svg>
      </div>
    </div>
  )
}
