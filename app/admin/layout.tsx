import type { Metadata } from "next"
import type { ReactNode } from "react"
import { holeEigenesProfil } from "@/lib/queries/profile"
import { zaehleEntwuerfe, zaehleNachrichten } from "@/lib/queries/nachrichten"
import { Sidebar } from "@/components/layout/Sidebar"
import { AdminNavAnbieter } from "@/components/layout/AdminNavKontext"
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
    <AdminNavAnbieter profil={profil} postfachAnzahl={postfachAnzahl} entwurfAnzahl={entwurfAnzahl}>
      {/* Unter lg eine Spalte: die Seitenleiste ist ausgeblendet und steckt im
          Menü des Seitenkopfs (MobilLeiste). h-dvh statt h-screen, damit die
          mobile Adressleiste den unteren Rand nicht verdeckt. */}
      <div className="grid h-dvh grid-cols-1 bg-bg lg:grid-cols-[220px_minmax(0,1fr)]">
        {/* Rendert nichts sichtbares -- hält nur den Hintergrund-Mailabruf am Laufen,
            solange irgendeine /admin-Seite offen ist (Task 7). */}
        <MailAbrufer />
        <Sidebar />
        {/* Arbeitsfläche in --bg: Panels (surface) heben sich davon ab. Den
            Innenabstand (p-4 lg:p-6, gap-4) setzt jede Seite in ihrem main. */}
        <div className="flex min-h-0 min-w-0 flex-col bg-bg">{children}</div>
      </div>
    </AdminNavAnbieter>
  )
}
