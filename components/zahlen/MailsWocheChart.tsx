"use client"

import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts"
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/shadcn/chart"
import { formatZahl } from "@/lib/format"
import { useAnimiert } from "./useAnimiert"

const config = {
  ein: { label: "Eingang", color: "var(--brand)" },
  aus: { label: "Ausgang", color: "var(--heart)" },
} satisfies ChartConfig

// Linien statt gruppierter Säulen: 12 Wochen × 2 Säulen würden auf Handybreite zu dünn.
export function MailsWocheChart({ daten }: { daten: { label: string; ein: number; aus: number }[] }) {
  const animiert = useAnimiert()
  const punkt = { r: 4, strokeWidth: 2, stroke: "var(--surface)" }
  return (
    <ChartContainer config={config} className="h-64">
      <LineChart data={daten} margin={{ top: 6, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="label" tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={8} />
        <YAxis allowDecimals={false} tickLine={false} axisLine={false} tickFormatter={formatZahl} width={40} />
        <ChartTooltip cursor={{ stroke: "var(--line-2)", strokeWidth: 1 }} content={(p) => <ChartTooltipContent {...p} />} />
        <ChartLegend content={(p) => <ChartLegendContent payload={p.payload} form="linie" />} />
        <Line dataKey="ein" type="monotone" stroke="var(--color-ein)" strokeWidth={2} dot={false} activeDot={{ ...punkt, fill: "var(--color-ein)" }} isAnimationActive={animiert} />
        <Line dataKey="aus" type="monotone" stroke="var(--color-aus)" strokeWidth={2} dot={false} activeDot={{ ...punkt, fill: "var(--color-aus)" }} isAnimationActive={animiert} />
      </LineChart>
    </ChartContainer>
  )
}
