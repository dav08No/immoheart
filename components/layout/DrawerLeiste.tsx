import type { ReactNode } from "react"

// Aktionsleiste für Formulare, die ihren Zustand selbst halten und daher den `fuss`
// des Drawers nicht füllen können: sticky am unteren Rand des scrollenden
// Drawer-Inhalts. Muss letztes Kind sein und darf kein overflow-hidden-Vorfahren
// zwischen sich und dem Scroll-Container haben, sonst pinnt sticky nicht.
// Primäraktion als letztes Kind übergeben -- sie steht dann rechts (Ruling R3).
export function DrawerLeiste({ children }: { children: ReactNode }) {
  return (
    <div className="sticky bottom-0 z-10 -mx-4 mt-auto flex flex-wrap items-center justify-end gap-2 border-t border-line bg-surface px-4 py-3 sm:-mx-5 sm:px-5">
      {children}
    </div>
  )
}
