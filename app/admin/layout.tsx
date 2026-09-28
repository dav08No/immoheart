import type { Metadata } from "next"
import type { ReactNode } from "react"
import { holeEigenesProfil } from "@/lib/queries/profile"
import { zaehleEntwuerfe, zaehleNachrichten } from "@/lib/queries/nachrichten"
import { Sidebar } from "@/components/layout/Sidebar"
import { MailAbrufer } from "@/components/layout/MailAbrufer"

// KI-Aufrufe mit Retry/Ersatzmodell (siehe lib/ki/gemini.ts) können im
// Worst Case (6 Versuche + ~4s Backoff) länger dauern als Vercels
// Standard-Timeout; 60s ist das Maximum im Hobby-Plan. Gilt auch für Server
// Actions, die von /admin-Seiten ausgelöst werden.
export const maxDuration = 60

// robots.ts verbietet /admin Crawlern bereits per Disallow, aber nicht jeder
// Bot hält sich daran -- der Meta-Tag ist die zweite, zuverlässigere Sperre.
export const metadata: Metadata = { robots: { index: false, follow: false } }

export default async function AppLayout({ children }: { children: ReactNode }) {
  const [profil, postfachAnzahl, entwurfAnzahl] = await Promise.all([
    holeEigenesProfil(),
    zaehleNachrichten(),
    zaehleEntwuerfe(),
  ])

  return (
    <div className="grid h-screen grid-cols-[206px_minmax(0,1fr)]">
      {/* Rendert nichts sichtbares -- hält nur den Hintergrund-Mailabruf am Laufen,
          solange irgendeine /admin-Seite offen ist (Task 7). */}
      <MailAbrufer />
      <Sidebar profil={profil} postfachAnzahl={postfachAnzahl} entwurfAnzahl={entwurfAnzahl} />
      <div className="flex min-h-0 flex-col">{children}</div>
    </div>
  )
}
