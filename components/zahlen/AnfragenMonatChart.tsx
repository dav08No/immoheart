"use client"

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/shadcn/chart"
import { formatZahl } from "@/lib/format"
import { useAnimiert } from "./useAnimiert"

// Reihenfolge fest (Farbe folgt der Quelle, nie dem Rang). Neutral für "manuell" als
// Nebenquelle; die Kombination ist mit dem dataviz-Validator geprüft (hell und dunkel).
const config = {
  mail: { label: "Mail", color: "var(--brand)" },
  website: { label: "Website", color: "var(--heart)" },
  manuell: { label: "Manuell", color: "var(--chart-neutral)" },
} satisfies ChartConfig

export function AnfragenMonatChart({ daten }: { daten: { label: string; mail: number; website: number; manuell: number }[] }) {
  const animiert = useAnimiert()
  // Surface-Strich = 2px Lücke zwischen den gestapelten Segmenten (kein Rahmen).
  const segment = { stackId: "a", stroke: "var(--surface)", strokeWidth: 2, maxBarSize: 24, isAnimationActive: animiert }
  return (
    <ChartContainer config={config} className="h-64">
      <BarChart data={daten} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="label" tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={8} />
        <YAxis allowDecimals={false} tickLine={false} axisLine={false} tickFormatter={formatZahl} width={40} />
        <ChartTooltip cursor={{ fill: "var(--surface-2)" }} content={(p) => <ChartTooltipContent {...p} />} />
        <ChartLegend content={(p) => <ChartLegendContent payload={p.payload} />} />
        <Bar dataKey="mail" fill="var(--color-mail)" {...segment} />
        <Bar dataKey="website" fill="var(--color-website)" {...segment} />
        <Bar dataKey="manuell" fill="var(--color-manuell)" radius={[4, 4, 0, 0]} {...segment} />
      </BarChart>
    </ChartContainer>
  )
}
