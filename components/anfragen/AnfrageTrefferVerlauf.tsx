import { Abschnittstitel } from "@/components/ui/Abschnittstitel"
import { Leerzustand } from "@/components/ui/Leerzustand"
import { formatZeitpunkt } from "@/lib/format"
import type { VerlaufEintrag } from "@/lib/queries/anfragen"
import type { BesterMatch } from "./typen"

export function BesterTreffer({ besterMatch, veraltet }: { besterMatch: NonNullable<BesterMatch>; veraltet: boolean }) {
  return (
    <section className="flex flex-col gap-2.5">
      <div>
        <Abschnittstitel>Bester Treffer</Abschnittstitel>
        <p className="mt-1 text-sm font-medium text-ink wrap-anywhere">{besterMatch.objekte?.titel ?? "?"}</p>
      </div>
      {veraltet ? (
        <p className="text-xs text-ink-2">
          Die Angaben wurden geändert, die Treffer werden neu berechnet. Drawer schliessen und erneut öffnen, um den
          aktuellen Treffer zu sehen.
        </p>
      ) : (
        <div className="flex flex-col gap-1.5">
          {besterMatch.kriterien.map((k) => (
            <div key={k.kriterium} className="grid grid-cols-[78px_1fr_34px] items-center gap-2.5 text-xs">
              <span className="truncate text-ink-2" title={k.kriterium}>
                {k.kriterium}
              </span>
              <span className="h-1.5 overflow-hidden rounded-sm bg-surface-3">
                <span
                  className={`block h-full ${k.status === "ok" ? "bg-brand" : k.status === "teilweise" ? "bg-warn" : "bg-crit"}`}
                  style={{ width: `${k.status === "ok" ? 100 : k.status === "teilweise" ? 60 : 20}%` }}
                />
              </span>
              <span className="text-right text-ink-2">{besterMatch.score}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

export function Verlauf({ verlauf }: { verlauf: VerlaufEintrag[] }) {
  return (
    <section className="flex flex-col gap-2">
      <Abschnittstitel>Verlauf</Abschnittstitel>
      {verlauf.length === 0 ? (
        <Leerzustand klein text="Noch kein Verlauf." />
      ) : (
        <ul>
          {verlauf.map((eintrag, i) => (
            <li key={i} className="grid grid-cols-[74px_1fr] gap-2.5 border-b border-line py-1.5 text-xs text-ink-2 last:border-b-0">
              <time className="text-ink-2">{formatZeitpunkt(new Date(eintrag.zeitpunkt))}</time>
              <span className="min-w-0 text-ink wrap-break-word">{eintrag.text}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
