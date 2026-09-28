import type { Metadata } from "next"
import type { ReactNode } from "react"

// Login/Passwort-Seiten sind für Crawler wertlos und sollen nie indexiert
// werden; robots.ts sperrt die Pfade zusätzlich per Disallow. login/page.tsx
// ist eine Client Component und kann selbst kein metadata exportieren, darum
// hier im Layout.
export const metadata: Metadata = { robots: { index: false, follow: false } }

export default function AuthLayout({ children }: { children: ReactNode }) {
  return children
}
