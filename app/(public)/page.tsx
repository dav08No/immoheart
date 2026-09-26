import { erstelleServerClient } from "@/lib/supabase/server"

export const revalidate = 300

export default async function StartSeite() {
  const supabase = await erstelleServerClient()
  const { count } = await supabase.from("objekte_oeffentlich").select("id", { count: "exact", head: true })

  return (
    <section className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-24">
      <h1 className="max-w-3xl font-display text-5xl font-bold leading-tight text-ink sm:text-6xl">
        Gewerbeflächen mit <span className="text-heart">Herzschlag</span>.
      </h1>
      <p className="max-w-xl text-lg text-ink-2">
        Büro, Gewerbe, Produktion und Lager in der Region Solothurn — persönlich vermittelt.
      </p>
      <p className="text-sm text-ink-3">{count ?? 0} Objekte verfügbar · Website im Aufbau</p>
    </section>
  )
}
