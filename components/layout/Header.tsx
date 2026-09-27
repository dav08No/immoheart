import { ThemeUmschalter } from "@/components/theme/ThemeUmschalter"

export function Header({ titel, untertitel }: { titel: string; untertitel?: string }) {
  return (
    <header className="flex h-14 flex-none items-center gap-3 border-b border-line bg-surface px-5">
      <h1 className="font-display text-lg font-bold text-ink">{titel}</h1>
      {untertitel && <span className="text-xs text-ink-3">{untertitel}</span>}
      <span className="flex-1" />
      <ThemeUmschalter />
    </header>
  )
}
