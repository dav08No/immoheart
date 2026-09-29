import type { ReactNode } from "react"
import { HerzLogo } from "@/components/public/HerzLogo"
import { AnmeldeModell } from "./AnmeldeModell"
import { Panel } from "@/components/ui/Panel"

// Gemeinsamer Rahmen der Anmelde-Seiten (Login, Passwort vergessen/setzen, Link
// bestätigen): Desktop zweigeteilt mit Markenfläche links, Handy nur ein schmaler
// Markenstreifen oben. Bewusst ohne "use client", damit auch Server-Seiten ihn nutzen.
// Text auf dem Verlauf nur in nav-text/nav-text-2 (>= 5.8:1 auch am hellen Ende);
// das Herz in nav-akzent, weil heart dort keine 3:1 erreicht. Der Herzschlag des
// HerzLogo ruht bei reduzierter Bewegung (globale Regel in globals.css).
const LOGO_HELL = "text-nav-text [&_svg]:fill-nav-akzent [&_svg]:text-nav-akzent"

// Nebenlinks unter dem Formular (Passwort vergessen, Zur Website, Zum Login).
export const AUTH_LINK_KLASSE =
  "rounded text-sm text-ink-2 hover:text-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"

export function AnmeldeRahmen({ titel, children }: { titel: string; children: ReactNode }) {
  return (
    <main className="flex min-h-dvh flex-col bg-bg lg:flex-row">
      <div className="flex-none bg-linear-to-br from-nav-von to-nav-bis px-4 py-3 lg:flex lg:w-[44%] lg:flex-col lg:justify-between lg:p-12">
        <HerzLogo className={LOGO_HELL} />
        {/* Das Stadtmodell der Startseite (gleicher Verlauf), nur auf Desktop: auf dem
            Handy bleibt der Streifen schmal und das Login lädt kein three. */}
        <div className="hidden min-h-0 flex-1 items-center justify-center py-6 lg:flex">
          <AnmeldeModell />
        </div>
        <div className="hidden lg:block">
          <p className="font-display text-4xl font-bold leading-tight text-nav-text">Gewerbeflächen mit Herzschlag.</p>
          <p className="mt-3 text-nav-text-2">Büro, Gewerbe, Produktion und Lager in der Region Solothurn.</p>
        </div>
      </div>
      <div className="flex flex-1 items-center justify-center p-4 sm:p-8">
        <Panel className="w-full max-w-sm sm:p-6">
          <h1 className="mb-4 font-display text-2xl font-bold text-ink wrap-anywhere">{titel}</h1>
          {children}
        </Panel>
      </div>
    </main>
  )
}
