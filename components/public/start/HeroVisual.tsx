import { StadtFallback } from "./StadtFallback"

// Platzhalter für das Stadtmodell (Task 6): die feste Seitenverhältnis-Box
// reserviert den Platz, damit das spätere Überblenden auf WebGL nichts verschiebt.
export function HeroVisual() {
  return (
    <div className="relative mx-auto aspect-square w-full max-w-md lg:max-w-none">
      <StadtFallback />
    </div>
  )
}
