import Link from "next/link"
import { Building2, Search } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { EkgLinie } from "./EkgLinie"

type Spur = { titel: string; icon: LucideIcon; link: { href: string; text: string }; schritte: { titel: string; text: string }[] }

const SPUREN: Spur[] = [
  {
    titel: "Für Suchende",
    icon: Search,
    link: { href: "/suchauftrag", text: "Suchauftrag erteilen" },
    schritte: [
      { titel: "Suchauftrag", text: "Sie sagen uns, welche Fläche Sie wo und ab wann brauchen." },
      { titel: "Passende Objekte", text: "Wir gleichen Ihren Auftrag mit unserem Bestand ab und melden uns." },
      { titel: "Besichtigung", text: "Gefällt Ihnen ein Objekt, organisieren wir die Besichtigung vor Ort." },
    ],
  },
  {
    titel: "Für Eigentümer",
    icon: Building2,
    link: { href: "/inserieren", text: "Objekt inserieren" },
    schritte: [
      { titel: "Mail mit Fotos", text: "Sie senden uns die Eckdaten Ihres Objekts samt Fotos per E-Mail." },
      { titel: "Prüfung", text: "Wir prüfen die Angaben und fragen nach, falls noch etwas fehlt." },
      { titel: "Veröffentlichung", text: "Ihr Objekt geht auf immoheart online und erreicht Suchende." },
    ],
  },
]

export function SoFunktionierts() {
  return (
    <section aria-labelledby="ablauf-titel" className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-16 sm:py-20">
      <header className="flex max-w-2xl flex-col gap-2">
        <h2 id="ablauf-titel" className="font-display text-3xl font-bold text-ink sm:text-4xl">
          So funktioniert&apos;s
        </h2>
        <p className="text-ink-2">Zwei Wege, ein Ziel: die richtige Fläche für das richtige Unternehmen.</p>
      </header>
      <EkgLinie />
      <div className="grid gap-6 md:grid-cols-2">
        {SPUREN.map((spur) => (
          <div key={spur.titel} className="flex flex-col gap-4 rounded-card border border-line bg-surface p-6">
            <h3 className="flex items-center gap-2 font-display text-xl font-bold text-ink">
              <spur.icon className="size-5 text-brand" aria-hidden />
              {spur.titel}
            </h3>
            <ol className="flex flex-col gap-4">
              {spur.schritte.map((schritt, i) => (
                <li key={schritt.titel} className="flex gap-3">
                  <span
                    aria-hidden
                    className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-soft font-display font-bold text-brand"
                  >
                    {i + 1}
                  </span>
                  <div className="flex flex-col gap-0.5">
                    <p className="font-semibold text-ink">{schritt.titel}</p>
                    <p className="text-sm text-ink-2">{schritt.text}</p>
                  </div>
                </li>
              ))}
            </ol>
            <Link href={spur.link.href} className="mt-auto w-fit text-sm font-semibold text-brand underline-offset-4 hover:underline">
              {spur.link.text} →
            </Link>
          </div>
        ))}
      </div>
    </section>
  )
}
