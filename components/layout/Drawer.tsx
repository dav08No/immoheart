"use client"

import { useEffect, useId, useRef, type ReactNode } from "react"
import { X } from "lucide-react"

type Props = {
  offen: boolean
  titel: string
  untertitel?: string
  onSchliessen: () => void
  children: ReactNode
  // Status-Chip neben dem Titel, wie im PanelKopf.
  chip?: ReactNode
  // Aktionsleiste unten, bleibt beim Scrollen des Inhalts sichtbar.
  fuss?: ReactNode
}

export function Drawer({ offen, titel, untertitel, onSchliessen, children, chip, fuss }: Props) {
  const titelId = useId()
  const panelRef = useRef<HTMLElement>(null)
  const vorherigesFokusElement = useRef<HTMLElement | null>(null)

  useEffect(() => {
    function beiEscape(ereignis: KeyboardEvent) {
      if (offen && ereignis.key === "Escape") onSchliessen()
    }
    document.addEventListener("keydown", beiEscape)
    return () => document.removeEventListener("keydown", beiEscape)
  }, [offen, onSchliessen])

  useEffect(() => {
    if (!offen) return
    vorherigesFokusElement.current = document.activeElement as HTMLElement | null
    panelRef.current?.focus()
    const vorherigerOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = vorherigerOverflow
      vorherigesFokusElement.current?.focus()
    }
  }, [offen])

  return (
    <>
      <div
        onClick={onSchliessen}
        className={`fixed inset-0 z-40 bg-navy/40 transition-opacity motion-reduce:transition-none ${
          offen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />
      <aside
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal={offen ? true : undefined}
        aria-labelledby={titelId}
        aria-hidden={!offen}
        inert={!offen ? true : undefined}
        className={`fixed right-0 top-0 z-50 flex h-full w-full flex-col sm:max-w-[440px] border-l border-line bg-surface shadow-2xl transition-transform motion-reduce:transition-none ${
          offen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex flex-none items-start gap-3 border-b border-line px-4 py-3.5 sm:px-5">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <h2 id={titelId} className="min-w-0 font-display text-lg font-semibold text-ink wrap-anywhere">
                {titel}
              </h2>
              {chip}
            </div>
            {untertitel && <p className="mt-0.5 text-sm text-ink-2 wrap-anywhere">{untertitel}</p>}
          </div>
          <button
            type="button"
            onClick={onSchliessen}
            aria-label="Schliessen"
            className="-mr-1 grid size-8 flex-none place-items-center rounded-lg text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none"
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>
        {/* Mit DrawerLeiste als Abschluss kein Innenabstand unten: sonst bliebe unter der
            Leiste eine leere Lücke (Handy ~40 px), wenn ganz nach unten gescrollt ist. */}
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4 pb-10 sm:p-5 has-data-drawer-leiste:pb-0 sm:has-data-drawer-leiste:pb-0">
          {children}
        </div>
        {fuss && (
          <div className="flex flex-none flex-wrap items-center justify-end gap-2 border-t border-line bg-surface px-4 py-3 sm:px-5">
            {fuss}
          </div>
        )}
      </aside>
    </>
  )
}
