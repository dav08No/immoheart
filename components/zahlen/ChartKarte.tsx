import type { ReactNode } from "react"

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
    <section className="flex min-w-0 flex-col rounded-card border border-line bg-surface p-4">
      <h2 className="font-display text-sm font-bold text-ink">{titel}</h2>
      <p className="mt-0.5 text-xs text-ink-3">{beschreibung}</p>
      {leer ? (
        <p className="flex h-40 items-center justify-center text-sm text-ink-3">Noch keine Daten</p>
      ) : (
        <>
          <div className="mt-3">{children}</div>
          <details className="mt-2 text-xs text-ink-2">
            <summary className="cursor-pointer select-none text-ink-3 hover:text-ink-2">Als Tabelle</summary>
            <div className="mt-2 overflow-x-auto">
              <table className="w-full border-collapse tabular-nums">
                <thead>
                  <tr>
                    {tabelle.spalten.map((s) => (
                      <th key={s} scope="col" className="border-b border-line px-2 py-1 text-left font-medium text-ink-2">{s}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tabelle.zeilen.map((zeile, i) => (
                    <tr key={i}>
                      {zeile.map((zelle, j) => (
                        <td key={j} className="border-b border-line px-2 py-1 text-ink">{zelle}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </>
      )}
    </section>
  )
}
