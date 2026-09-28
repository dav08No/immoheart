import Link from "next/link"
import { Mail } from "lucide-react"
import { Button } from "@/components/shadcn/button"
import { AdresseKopieren } from "@/components/public/AdresseKopieren"
import { IMMOHEART_MAIL } from "@/lib/mailto"

// Ziel des Header-Links "/#kontakt"; scroll-mt hält den Titel unter dem Sticky-Header frei.
export function Kontakt() {
  return (
    <section id="kontakt" aria-labelledby="kontakt-titel" className="scroll-mt-20 border-t border-line bg-surface">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-16 sm:py-20 md:grid-cols-2">
        <div className="flex flex-col gap-3">
          <h2 id="kontakt-titel" className="font-display text-3xl font-bold text-ink sm:text-4xl">
            Kontakt
          </h2>
          <p className="max-w-md text-ink-2">
            Fragen zu einem Objekt, zu Ihrer Suche oder zum Inserieren? Schreiben Sie uns – wir antworten persönlich.
          </p>
          <p className="flex flex-wrap gap-x-4 gap-y-1 pt-2 text-sm font-semibold">
            <Link href="/suchauftrag" className="text-brand underline-offset-4 hover:underline">
              Suchauftrag erteilen
            </Link>
            <Link href="/inserieren" className="text-brand underline-offset-4 hover:underline">
              Objekt inserieren
            </Link>
          </p>
        </div>
        <div className="flex flex-col gap-4 rounded-card border border-line bg-surface-2 p-6">
          <p className="text-sm text-ink-2">E-Mail</p>
          <p className="break-all font-display text-xl font-bold text-ink">{IMMOHEART_MAIL}</p>
          <div className="flex flex-wrap items-start gap-2">
            <Button asChild>
              <a href={`mailto:${IMMOHEART_MAIL}`}>
                <Mail aria-hidden />
                E-Mail schreiben
              </a>
            </Button>
            <AdresseKopieren />
          </div>
        </div>
      </div>
    </section>
  )
}
