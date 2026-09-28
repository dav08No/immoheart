import { Stadtmodell } from "./Stadtmodell"

// Die feste Seitenverhältnis-Box reserviert den Platz, damit das Überblenden
// vom SVG-Fallback auf WebGL nichts verschiebt.
export function HeroVisual() {
  return (
    <div className="relative mx-auto aspect-square w-full max-w-md lg:max-w-none">
      <Stadtmodell />
    </div>
  )
}
