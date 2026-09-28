import type { ReactNode } from "react"

// Markiert Text, den Davide noch durch echte Betreiberangaben ersetzen muss.
// Warnfarbe statt Fliesstext, damit ein Platzhalter nie versehentlich live bleibt.
export function Platzhalter({ children }: { children: ReactNode }) {
  return <span className="rounded bg-warn-bg px-1 py-0.5 font-medium text-warn">{children}</span>
}
