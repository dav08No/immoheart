import type { ReactNode } from "react"
import { Panel, PanelKopf } from "@/components/ui/Panel"
import { Tabelle as TabelleBaustein } from "@/components/ui/Tabelle"

export type Tabelle = { spalten: string[]; zeilen: (string | number)[][] }

// Rahmen jedes Diagramms: Titel, eine Zeile Beschreibung, Leerzustand statt Nullbalken
// und eine Tabellenansicht als Alternative zu Farbe und Tooltip (Barrierefreiheit).
export function ChartKarte({
  titel,
  beschreibung,
  leer,
  tabelle,
  children,
}: {
  titel: string
  beschreibung: string
  leer: boolean
  tabelle: Tabelle
  children: ReactNode
}) {
  return (
    <Panel as="section" className="flex min-w-0 flex-col">
      <PanelKopf titel={titel} beschreibung={beschreibung} />
      {leer ? (
        <p className="flex h-40 items-center justify-center text-sm text-ink-2">Noch keine Daten</p>
      ) : (
        <>
          <div>{children}</div>
          <details className="mt-3 text-xs text-ink-2">
            <summary className="cursor-pointer select-none text-ink-2 hover:text-ink">Als Tabelle</summary>
            <div className="mt-2">
              <TabelleBaustein ariaLabel={`${titel} als Tabelle`}>
                <thead>
                  <tr>
                    {tabelle.spalten.map((s) => (
                      <th key={s} scope="col">{s}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tabelle.zeilen.map((zeile, i) => (
                    <tr key={i}>
                      {zeile.map((zelle, j) => (
                        <td key={j}>{zelle}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </TabelleBaustein>
            </div>
          </details>
        </>
      )}
    </Panel>
  )
}
