import { BadgeCheck, HeartHandshake, MapPin, Timer } from "lucide-react"

const PUNKTE = [
  { icon: HeartHandshake, titel: "Persönlich", text: "Sie sprechen direkt mit uns – keine anonyme Plattform, kein Callcenter." },
  { icon: MapPin, titel: "Regional", text: "Wir kennen die Region Solothurn und ihre Gewerbeflächen aus erster Hand." },
  { icon: Timer, titel: "Schnelle Antwort", text: "Auf Anfragen und Suchaufträge melden wir uns rasch und persönlich zurück." },
  { icon: BadgeCheck, titel: "Geprüfte Angaben", text: "Jedes Objekt wird vor der Veröffentlichung von uns geprüft." },
] as const

export function Warum() {
  return (
    <section aria-labelledby="warum-titel" className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-16 sm:py-20">
      <h2 id="warum-titel" className="font-display text-3xl font-bold text-ink sm:text-4xl">
        Warum immoheart
      </h2>
      <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {PUNKTE.map(({ icon: Icon, titel, text }) => (
          <li key={titel} className="flex flex-col gap-3">
            <span className="flex size-11 items-center justify-center rounded-full bg-brand-soft text-brand" aria-hidden>
              <Icon className="size-5" />
            </span>
            <h3 className="font-display text-lg font-bold text-ink">{titel}</h3>
            <p className="text-sm text-ink-2">{text}</p>
          </li>
        ))}
      </ul>
    </section>
  )
}
