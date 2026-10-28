import type { ReactNode } from "react"
import { SiteHeader } from "@/components/public/SiteHeader"
import { SiteFooter } from "@/components/public/SiteFooter"

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    // "website" schaltet Farben und Schrift auf espaceSOLOTHURN um (app/globals.css).
    <div className="website flex min-h-screen flex-col bg-bg font-sans text-ink">
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  )
}
