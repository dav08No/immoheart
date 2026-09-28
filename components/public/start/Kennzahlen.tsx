import type { Kennzahlen as KennzahlenTyp } from "@/lib/kennzahlen"
import { Zaehler } from "./Zaehler"

export function Kennzahlen({ kennzahlen }: { kennzahlen: KennzahlenTyp }) {
  const eintraege = [
    { wert: kennzahlen.objekte, label: kennzahlen.objekte === 1 ? "verfügbares Objekt" : "verfügbare Objekte" },
    // Flächen können Dezimalstellen haben; die Startseite zeigt ganze m².
    { wert: Math.round(kennzahlen.flaecheTotal), label: "m² Fläche total" },
    { wert: kennzahlen.orte, label: kennzahlen.orte === 1 ? "Ort" : "Orte" },
  ]

  return (
    <section aria-labelledby="kennzahlen-titel" className="border-b border-line bg-surface">
      <h2 id="kennzahlen-titel" className="sr-only">
        Aktuelles Angebot in Zahlen
      </h2>
      <dl className="mx-auto grid max-w-6xl gap-6 px-4 py-10 sm:grid-cols-3">
        {eintraege.map((e) => (
          <div key={e.label} className="flex flex-col items-center gap-1 text-center">
            <dt className="order-2 text-sm font-medium text-ink-2">{e.label}</dt>
            <dd className="order-1 font-display text-4xl font-bold text-brand sm:text-5xl">
              <Zaehler wert={e.wert} />
            </dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
