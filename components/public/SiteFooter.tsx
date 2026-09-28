import Link from "next/link"
import { IMMOHEART_MAIL } from "@/lib/mailto"
import { HerzLogo } from "./HerzLogo"

const LINKS = [
  { href: "/impressum", label: "Impressum" },
  { href: "/datenschutz", label: "Datenschutz" },
  { href: "/objekte", label: "Objekte" },
  { href: "/login", label: "Login" },
] as const

export function SiteFooter() {
  // new Date() ist auf dem Server ok: die Jahreszahl ändert sich nur einmal
  // pro Jahr, kein Grund für eine Client-Insel.
  const jahr = new Date().getFullYear()

  return (
    <footer className="border-t border-line bg-surface">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 text-sm text-ink-2 sm:flex-row sm:items-center">
        <div className="flex flex-col gap-1">
          <HerzLogo className="text-base" />
          <span className="text-ink-3">ein Angebot von espaceSOLOTHURN</span>
        </div>
        <span className="flex-1" />
        <nav aria-label="Fusszeile" className="flex flex-wrap items-center gap-x-5 gap-y-2">
          {LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="hover:text-ink">
              {link.label}
            </Link>
          ))}
          <a href={`mailto:${IMMOHEART_MAIL}`} className="hover:text-brand">
            {IMMOHEART_MAIL}
          </a>
        </nav>
        <span className="text-ink-3">© {jahr} immoheart</span>
      </div>
    </footer>
  )
}
