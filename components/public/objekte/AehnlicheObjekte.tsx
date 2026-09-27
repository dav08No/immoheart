import type { OeffentlichesObjekt } from "@/lib/objektsuche"
import { ObjektKarte } from "./ObjektKarte"

export function AehnlicheObjekte({ objekte }: { objekte: OeffentlichesObjekt[] }) {
  if (objekte.length === 0) return null
  return (
    <section aria-labelledby="aehnliche-objekte" className="flex flex-col gap-5">
      <h2 id="aehnliche-objekte" className="font-display text-2xl font-bold text-ink">Ähnliche Objekte</h2>
      <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {objekte.map((o) => (
          <li key={o.id} className="flex">
            <ObjektKarte objekt={o} titelEbene="h3" />
          </li>
        ))}
      </ul>
    </section>
  )
}
