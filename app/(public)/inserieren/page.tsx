import type { Metadata } from "next"
import { InserierenAktion } from "@/components/public/inserieren/InserierenAktion"

export const metadata: Metadata = {
  title: "Inserieren",
  description:
    "Gewerbefläche in der Region Solothurn inserieren: Angaben per E-Mail senden – wir prüfen und veröffentlichen Ihr Objekt bei immoheart.",
}

const SCHRITTE = [
  { titel: "Mail senden", text: "Sie schicken uns die Eckdaten Ihres Objekts – am einfachsten mit unserer Vorlage." },
  { titel: "Wir prüfen und melden uns", text: "Wir sichten Ihre Angaben und melden uns persönlich, falls noch etwas fehlt." },
  { titel: "Objekt wird veröffentlicht", text: "Nach der Prüfung stellen wir Ihr Objekt auf immoheart online." },
] as const

export default function InserierenPage() {
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-10 px-4 py-10">
      <header className="flex max-w-3xl flex-col gap-3">
        <h1 className="font-display text-3xl font-bold text-ink sm:text-4xl">Inserieren</h1>
        <p className="text-lg text-ink-2">
          Sie haben eine Gewerbefläche in der Region Solothurn zu vermieten oder zu verkaufen? Schreiben Sie
          uns – wir kümmern uns um die Veröffentlichung.
        </p>
      </header>

      <ol className="grid gap-4 sm:grid-cols-3">
        {SCHRITTE.map((schritt, i) => (
          <li key={schritt.titel} className="flex flex-col gap-2 rounded-card border border-line bg-surface p-5">
            <span className="flex size-8 items-center justify-center rounded-full bg-brand-soft font-display font-bold text-brand" aria-hidden>
              {i + 1}
            </span>
            <h2 className="font-display text-lg font-bold text-ink">{schritt.titel}</h2>
            <p className="text-sm text-ink-2">{schritt.text}</p>
          </li>
        ))}
      </ol>

      <div className="max-w-xl">
        <InserierenAktion />
      </div>
    </div>
  )
}
