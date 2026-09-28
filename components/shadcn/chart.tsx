"use client"

// Diagramm-Grundbausteine im shadcn-Stil über Recharts. Anders als das shadcn-Original
// kommen Farben nie als Hex, sondern als CSS-Token (var(--brand) …) -- hell/dunkel
// wechselt damit automatisch mit dem Theme, ohne eigene <style>-Blöcke.
import * as React from "react"
import * as RechartsPrimitive from "recharts"
import type { LegendPayload, TooltipContentProps } from "recharts"
import { cn } from "@/lib/utils"
import { formatZahl } from "@/lib/format"

export type ChartConfig = Record<string, { label: string; color: string }>

const ChartContext = React.createContext<ChartConfig | null>(null)

function useChart(): ChartConfig {
  const config = React.useContext(ChartContext)
  if (!config) throw new Error("useChart muss innerhalb von <ChartContainer> verwendet werden")
  return config
}

// Setzt je Serie --color-<schluessel>, damit Marks einfach fill="var(--color-mail)" nutzen.
function ChartContainer({
  config,
  className,
  style,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  config: ChartConfig
  children: React.ComponentProps<typeof RechartsPrimitive.ResponsiveContainer>["children"]
}) {
  const farben = Object.fromEntries(Object.entries(config).map(([k, v]) => [`--color-${k}`, v.color]))
  return (
    <ChartContext.Provider value={config}>
      <div
        data-slot="chart"
        className={cn(
          "w-full text-xs [&_.recharts-cartesian-axis-tick_text]:fill-ink-2 [&_.recharts-cartesian-grid_line]:stroke-line [&_.recharts-surface]:outline-none",
          className
        )}
        {...props}
        style={{ ...style, ...farben } as React.CSSProperties}
      >
        <RechartsPrimitive.ResponsiveContainer>{children}</RechartsPrimitive.ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  )
}

const ChartTooltip = RechartsPrimitive.Tooltip

// Wert fett vorne, Serienname dahinter; Serien-Schlüssel als kurzer Strich statt Kästchen.
function ChartTooltipContent({ active, payload, label }: Partial<TooltipContentProps>) {
  const config = useChart()
  if (!active || !payload || payload.length === 0) return null
  return (
    <div className="min-w-32 rounded-lg border border-line bg-surface px-2.5 py-1.5 text-xs shadow-md">
      {label !== undefined && <div className="mb-1 font-medium text-ink">{String(label)}</div>}
      <div className="grid gap-1">
        {payload.map((eintrag) => {
          const schluessel = String(eintrag.dataKey ?? eintrag.name ?? "")
          const serie = config[schluessel]
          const wert = typeof eintrag.value === "number" ? formatZahl(eintrag.value) : String(eintrag.value ?? "")
          return (
            <div key={schluessel} className="flex items-center gap-2">
              <span aria-hidden className="h-0.5 w-3 shrink-0 rounded-full" style={{ background: serie?.color ?? eintrag.color }} />
              <span className="font-semibold text-ink tabular-nums">{wert}</span>
              <span className="text-ink-2">{serie?.label ?? schluessel}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

const ChartLegend = RechartsPrimitive.Legend

// Legende spiegelt die Mark-Form: Rechteck für Balken, Strich für Linien.
function ChartLegendContent({ payload, form = "rechteck" }: { payload?: readonly LegendPayload[]; form?: "rechteck" | "linie" }) {
  const config = useChart()
  if (!payload || payload.length === 0) return null
  return (
    <ul className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 pt-2 text-xs text-ink-2">
      {payload.map((eintrag) => {
        const schluessel = String(eintrag.dataKey ?? eintrag.value ?? "")
        const serie = config[schluessel]
        return (
          <li key={schluessel} className="flex items-center gap-1.5">
            <span
              aria-hidden
              className={form === "linie" ? "h-0.5 w-3 rounded-full" : "size-2.5 rounded-[3px]"}
              style={{ background: serie?.color ?? eintrag.color }}
            />
            {serie?.label ?? schluessel}
          </li>
        )
      })}
    </ul>
  )
}

export { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent, useChart }
