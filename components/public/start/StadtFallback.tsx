// Statisches Bild des Stadtmodells: isometrische Gewerbebauten in Petrol-Tönen,
// ein Gebäude in Koralle, EKG-Linie am Boden. Steht im Server-HTML und bleibt der
// Fallback, wenn kein WebGL geladen werden darf (reduzierte Bewegung, schwaches Gerät).

import { BAUTEN, EKG_PUNKTE, EKG_Y, type Bau } from "./stadtDaten"

const MASS = 20
const COS = Math.cos(Math.PI / 6) * MASS
const SIN = Math.sin(Math.PI / 6) * MASS
const MITTE_X = 200
const MITTE_Y = 150

function punkt(x: number, y: number, z: number): string {
  const sx = MITTE_X + (x - y) * COS
  const sy = MITTE_Y + (x + y) * SIN - z * MASS * 0.9
  return `${sx.toFixed(1)},${sy.toFixed(1)}`
}

function flaechen({ x, y, b, t, h }: Bau) {
  const x2 = x + b
  const y2 = y + t
  return {
    dach: [punkt(x, y, h), punkt(x2, y, h), punkt(x2, y2, h), punkt(x, y2, h)].join(" "),
    links: [punkt(x, y2, 0), punkt(x2, y2, 0), punkt(x2, y2, h), punkt(x, y2, h)].join(" "),
    rechts: [punkt(x2, y, 0), punkt(x2, y2, 0), punkt(x2, y2, h), punkt(x2, y, h)].join(" "),
  }
}

// Hintere Bauten zuerst zeichnen, damit vordere sie verdecken.
const SORTIERT = [...BAUTEN].sort((a, b) => a.x + a.y - (b.x + b.y))

const BODEN = [punkt(-1, -1, 0), punkt(9.5, -1, 0), punkt(9.5, 9, 0), punkt(-1, 9, 0)].join(" ")

const EKG = EKG_PUNKTE.map(([x, z]) => punkt(x, EKG_Y, z * 0.5)).join(" ")

export function StadtFallback() {
  return (
    <svg viewBox="0 0 400 400" className="size-full" aria-hidden focusable="false">
      <polygon points={BODEN} className="fill-on-hero/5 stroke-on-hero/15" strokeWidth={1} />
      {SORTIERT.map((bau) => {
        const f = flaechen(bau)
        return (
          <g key={`${bau.x}-${bau.y}`}>
            <polygon points={f.links} className={bau.herz ? "fill-heart" : "fill-brand-2"} />
            <polygon points={f.rechts} className={bau.herz ? "fill-heart" : "fill-brand"} />
            {/* Schattenseite deckend abdunkeln, damit dahinterliegende Bauten nicht durchscheinen. */}
            {bau.herz && <polygon points={f.rechts} className="fill-navy/30" />}
            <polygon points={f.dach} className={bau.herz ? "fill-heart" : "fill-on-hero-2"} />
            {/* heart-soft wäre im Dunkelmodus fast schwarz -- darum Koralle aufgehellt. */}
            {bau.herz && <polygon points={f.dach} className="fill-on-hero/40" />}
          </g>
        )
      })}
      <polyline
        points={EKG}
        fill="none"
        className="stroke-heart"
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
