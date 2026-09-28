import { ThemeUmschalter } from "@/components/theme/ThemeUmschalter"
import { MobilLeiste } from "./MobilLeiste"

// Unter lg zugleich die obere Leiste: Menü-Knopf (MobilLeiste) + Titel + Theme.
export function Header({ titel, untertitel }: { titel: string; untertitel?: string }) {
  return (
    <header className="flex h-14 flex-none items-center gap-2 border-b border-line bg-surface px-3 sm:gap-3 sm:px-5">
      <MobilLeiste />
      <h1 className="flex-none font-display text-lg font-bold text-ink">{titel}</h1>
      {untertitel && <span className="min-w-0 truncate text-xs text-ink-3">{untertitel}</span>}
      <span className="flex-1" />
      <ThemeUmschalter />
    </header>
  )
}
