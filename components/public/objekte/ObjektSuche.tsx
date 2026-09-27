"use client"

import { useId, type ReactNode } from "react"
import Link from "next/link"
import { SlidersHorizontal, X } from "lucide-react"
import type { ObjektFilter, Sortierung } from "@/lib/objektsuche"
import { Button } from "@/components/shadcn/button"
import {
  Sheet, SheetClose, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger,
} from "@/components/shadcn/sheet"
import { FilterFormular } from "./FilterFormular"
import { anzahlAktiverFilter, objekteText, type FilterOptionen } from "./anzeige"
import { useFilterUrl } from "./useFilterUrl"

const SORTIERUNGEN: { wert: Sortierung; label: string }[] = [
  { wert: "neu", label: "Neueste zuerst" },
  { wert: "flaeche", label: "Fläche aufsteigend" },
  { wert: "preis", label: "Preis/m² aufsteigend" },
]

type Props = { filter: ObjektFilter; optionen: FilterOptionen; anzahl: number; children: ReactNode }

// Ein Client-Rahmen um das serverseitig gerenderte Raster: Seitenleiste, Sheet und
// Sortierung teilen sich so denselben Filter-Entwurf (kein Wettlauf zweier Timer).
export function ObjektSuche({ filter, optionen, anzahl, children }: Props) {
  const [entwurf, setze] = useFilterUrl(filter)
  const sortId = useId()
  const aktiv = anzahlAktiverFilter(entwurf)

  const zuruecksetzen = aktiv > 0 && (
    <Link href="/objekte" scroll={false} className="text-sm font-medium text-brand underline-offset-4 hover:underline focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
      Filter zurücksetzen
    </Link>
  )

  return (
    <div className="grid gap-8 lg:grid-cols-[16rem_1fr]">
      <aside aria-label="Filter" className="hidden lg:block">
        <div className="sticky top-24 flex flex-col gap-6 rounded-card border border-line bg-surface p-5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-display text-lg font-bold text-ink">Filter</h2>
            {zuruecksetzen}
          </div>
          <FilterFormular filter={entwurf} optionen={optionen} setze={setze} />
        </div>
      </aside>

      <div className="flex min-w-0 flex-col gap-5">
        <div className="flex flex-wrap items-center gap-3">
          <p className="flex-1 text-sm font-medium text-ink-2" aria-live="polite">
            {objekteText(anzahl)}
          </p>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" className="lg:hidden">
                <SlidersHorizontal aria-hidden />
                Filter ({aktiv})
              </Button>
            </SheetTrigger>
            <SheetContent
              side="left"
              showCloseButton={false}
              className="w-[88%] gap-0 bg-bg motion-reduce:data-[state=closed]:animate-none motion-reduce:data-[state=open]:animate-none"
            >
              <SheetHeader className="flex-row items-center justify-between border-b border-line">
                <SheetTitle className="font-display text-lg">Filter</SheetTitle>
                <SheetDescription className="sr-only">Objekte nach Nutzung, Ort, Fläche und mehr eingrenzen.</SheetDescription>
                <SheetClose asChild>
                  <Button variant="ghost" size="icon-sm" aria-label="Filter schliessen">
                    <X aria-hidden />
                  </Button>
                </SheetClose>
              </SheetHeader>
              <div className="flex-1 overflow-y-auto p-4">
                <FilterFormular filter={entwurf} optionen={optionen} setze={setze} />
              </div>
              <SheetFooter className="flex-row items-center justify-between border-t border-line">
                {zuruecksetzen || <span />}
                <SheetClose asChild>
                  <Button>{objekteText(anzahl)} anzeigen</Button>
                </SheetClose>
              </SheetFooter>
            </SheetContent>
          </Sheet>
          <div className="flex items-center gap-2">
            <label htmlFor={sortId} className="text-sm text-ink-2">Sortieren</label>
            <select
              id={sortId}
              value={entwurf.sortierung}
              onChange={(e) => {
                const wahl = SORTIERUNGEN.find((s) => s.wert === e.target.value)
                if (wahl) setze({ sortierung: wahl.wert })
              }}
              className="h-9 rounded-md border border-line-2 bg-surface px-2 text-sm text-ink outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
            >
              {SORTIERUNGEN.map((s) => (
                <option key={s.wert} value={s.wert}>{s.label}</option>
              ))}
            </select>
          </div>
        </div>
        {children}
      </div>
    </div>
  )
}
