import type { ReactNode } from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"

type Props = {
  titel: string
  unterzeile?: string
  zeit?: string
  badges?: ReactNode
  icon?: ReactNode
  ungelesen?: boolean
  ausgewaehlt?: boolean
  onClick?: () => void
  href?: string
  ariaLabel?: string
}

const BASIS =
  "relative flex w-full min-w-0 items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors outline-none hover:bg-surface-2 focus-visible:ring-2 focus-visible:ring-ring"

// Eine Zeile für Postfach, Entwürfe usw.: immer echter Button oder Link, damit
// Tastatur und Screenreader sie wie jede andere Aktion bedienen.
export function ListenZeile({ titel, unterzeile, zeit, badges, icon, ungelesen, ausgewaehlt, onClick, href, ariaLabel }: Props) {
  const inhalt = (
    <>
      {/* Korallroter Balken markiert die Auswahl (zusätzlich zu Hintergrund und aria-current). */}
      {ausgewaehlt && <span aria-hidden className="absolute inset-y-1.5 left-0 w-[3px] rounded-full bg-heart" />}
      {icon && <span className="mt-0.5 shrink-0 text-ink-2">{icon}</span>}
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          {ungelesen && (
            <span className="size-2 shrink-0 rounded-full bg-brand">
              <span className="sr-only">Ungelesen</span>
            </span>
          )}
          {/* title-Attribut zeigt den vollen Text, wenn truncate kürzt. */}
          <span title={titel} className={cn("truncate text-sm text-ink", ungelesen ? "font-semibold" : "font-medium")}>
            {titel}
          </span>
        </span>
        {unterzeile && (
          <span title={unterzeile} className="mt-0.5 block truncate text-xs text-ink-2">
            {unterzeile}
          </span>
        )}
        {badges && <span className="mt-1.5 flex flex-wrap gap-1">{badges}</span>}
      </span>
      {zeit && <span className="shrink-0 whitespace-nowrap text-xs text-ink-2">{zeit}</span>}
    </>
  )

  const klasse = cn(BASIS, ausgewaehlt && "bg-brand-soft hover:bg-brand-soft")
  const aktuell = ausgewaehlt ? "true" : undefined

  if (href) {
    return (
      <Link href={href} onClick={onClick} aria-label={ariaLabel} aria-current={aktuell} className={klasse}>
        {inhalt}
      </Link>
    )
  }
  return (
    <button type="button" onClick={onClick} aria-label={ariaLabel} aria-current={aktuell} className={klasse}>
      {inhalt}
    </button>
  )
}
