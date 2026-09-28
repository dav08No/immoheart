import Link from "next/link"
import { ArrowRight } from "lucide-react"
import type { OeffentlichesObjekt } from "@/lib/objektsuche"
import { ObjektKarte } from "@/components/public/objekte/ObjektKarte"
import { TiltKarte } from "./TiltKarte"

export function Highlights({ objekte }: { objekte: OeffentlichesObjekt[] }) {
  // Ohne öffentliche Objekte gäbe es nur eine leere Überschrift.
  if (objekte.length === 0) return null

  return (
    <section aria-labelledby="highlights-titel" className="bg-surface-2">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-16 sm:py-20">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-col gap-2">
            <h2 id="highlights-titel" className="font-display text-3xl font-bold text-ink sm:text-4xl">
              Ausgewählte Objekte
            </h2>
            <p className="text-ink-2">Aktuelle Flächen aus der Region Solothurn.</p>
          </div>
          <Link
            href="/objekte"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand underline-offset-4 hover:underline"
          >
            Alle Objekte
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        </header>
        <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {objekte.map((objekt) => (
            <li key={objekt.id} className="flex">
              <TiltKarte>
                <ObjektKarte objekt={objekt} titelEbene="h3" />
              </TiltKarte>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
