import { holeAnzahlOeffentlicherObjekte } from "@/lib/queries/objekte"

export default async function StartSeite() {
  const anzahl = await holeAnzahlOeffentlicherObjekte()

  return (
    <section className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-24">
      <h1 className="max-w-3xl font-display text-5xl font-bold leading-tight text-ink sm:text-6xl">
        Gewerbeflächen mit <span className="text-heart">Herzschlag</span>.
      </h1>
      <p className="max-w-xl text-lg text-ink-2">
        Büro, Gewerbe, Produktion und Lager in der Region Solothurn — persönlich vermittelt.
      </p>
      <p className="text-sm text-ink-3">{anzahl === null ? "Website im Aufbau" : `${anzahl} Objekte verfügbar · Website im Aufbau`}</p>
    </section>
  )
}
