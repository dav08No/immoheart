import type { ReactNode } from "react"
import { holeEigenesProfil } from "@/lib/queries/profile"
import { zaehleNachrichten } from "@/lib/queries/nachrichten"
import { Sidebar } from "@/components/layout/Sidebar"

// KI-Aufrufe mit Retry/Ersatzmodell (siehe lib/ki/gemini.ts) können im
// Worst Case (6 Versuche + ~4s Backoff) länger dauern als Vercels
// Standard-Timeout; 60s ist das Maximum im Hobby-Plan. Gilt auch für Server
// Actions, die von /admin-Seiten ausgelöst werden.
export const maxDuration = 60

export default async function AppLayout({ children }: { children: ReactNode }) {
  const [profil, postfachAnzahl] = await Promise.all([holeEigenesProfil(), zaehleNachrichten()])

  return (
    <div className="grid h-screen grid-cols-[206px_minmax(0,1fr)]">
      <Sidebar profil={profil} postfachAnzahl={postfachAnzahl} />
      <div className="flex min-h-0 flex-col">{children}</div>
    </div>
  )
}
