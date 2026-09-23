"use client"

import { useEffect, useId, useRef } from "react"

type Props = {
  offen: boolean
  titel: string
  untertitel?: string
  onSchliessen: () => void
  children: React.ReactNode
}

export function Drawer({ offen, titel, untertitel, onSchliessen, children }: Props) {
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
        className={`fixed inset-0 z-40 bg-navy/40 transition-opacity ${
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
        className={`fixed right-0 top-0 z-50 flex h-full w-full max-w-[440px] flex-col border-l border-line bg-surface shadow-2xl transition-transform ${
          offen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-start gap-2.5 border-b border-line p-4">
          <div>
            <div id={titelId} className="font-display text-base font-bold text-ink">
              {titel}
            </div>
            {untertitel && <div className="mt-0.5 text-xs text-ink-3">{untertitel}</div>}
          </div>
          <button onClick={onSchliessen} aria-label="Schliessen" className="ml-auto px-1 text-lg text-ink-3">
            ×
          </button>
        </div>
        <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4 pb-10">{children}</div>
      </aside>
    </>
  )
}
