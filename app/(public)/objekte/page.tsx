import type { Metadata } from "next"
import Link from "next/link"
import { eigenschaftsSchluessel, filtereObjekte, leseFilter } from "@/lib/objektsuche"
import { holeOeffentlicheObjekte } from "@/lib/queries/oeffentlich"
import { ObjektKarte } from "@/components/public/objekte/ObjektKarte"
import { ObjektSuche } from "@/components/public/objekte/ObjektSuche"
import type { FilterOptionen } from "@/components/public/objekte/anzeige"

export const metadata: Metadata = {
  title: "Objekte · immoheart",
  description: "Freie Büro-, Gewerbe-, Produktions- und Lagerflächen in der Region Solothurn – filtern nach Nutzung, Ort, Fläche und Preis.",
}

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> }

export default async function ObjektePage({ searchParams }: Props) {
  const [params, alle] = await Promise.all([searchParams, holeOeffentlicheObjekte()])

  // Erlaubte Werte stammen aus den Objekten selbst; leseFilter verwirft alles andere.
  const orte = [...new Set(alle.map((o) => o.ort))].sort((a, b) => a.localeCompare(b, "de"))
  const eigenschaften = eigenschaftsSchluessel(alle)
  const filter = leseFilter(params, orte, eigenschaften)
  const treffer = filtereObjekte(alle, filter)

  const flaechen = alle.map((o) => o.flaeche)
  const min = Math.floor(Math.min(...flaechen))
  const max = Math.ceil(Math.max(...flaechen))
  const optionen: FilterOptionen = { orte, eigenschaften, flaeche: flaechen.length > 1 && min < max ? { min, max } : null }

  return (
    <section className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-12">
      <header className="flex flex-col gap-2">
        <h1 className="font-display text-4xl font-bold text-ink sm:text-5xl">Objekte</h1>
        <p className="max-w-2xl text-ink-2">Freie Gewerbeflächen in der Region Solothurn – persönlich vermittelt.</p>
      </header>

      <ObjektSuche filter={filter} optionen={optionen} anzahl={treffer.length}>
        {treffer.length > 0 ? (
          <ul className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {treffer.map((o) => (
              <li key={o.id} className="flex">
                <ObjektKarte objekt={o} />
              </li>
            ))}
          </ul>
        ) : (
          <div className="flex flex-col items-start gap-3 rounded-card border border-dashed border-line-2 bg-surface p-8">
            <h2 className="font-display text-xl font-bold text-ink">
              {alle.length === 0 ? "Zurzeit sind keine Objekte ausgeschrieben." : "Kein Objekt passt zu Ihrer Auswahl."}
            </h2>
            <p className="max-w-xl text-ink-2">
              Hinterlegen Sie einen Suchauftrag – wir melden uns, sobald eine passende Fläche frei wird.
            </p>
            {/* Kein eigener Zurücksetzen-Link hier: der in der Filterleiste bricht auch
                einen laufenden Timer ab. */}
            <Link href="/suchauftrag" className="text-sm font-medium text-brand underline-offset-4 hover:underline">
              Suchauftrag erfassen
            </Link>
          </div>
        )}
      </ObjektSuche>
    </section>
  )
}
