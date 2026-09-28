"use client"

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/shadcn/chart"
import { formatZahl } from "@/lib/format"
import { useAnimiert } from "./useAnimiert"

// "Gelöscht" bewusst neutral: die Geschichte ist, wie viele Entwürfe wirklich rausgingen.
const config = {
  gesendet: { label: "Gesendet", color: "var(--brand)" },
  geloescht: { label: "Gelöscht", color: "var(--chart-neutral)" },
} satisfies ChartConfig

export function EntwuerfeChart({ daten }: { daten: { label: string; gesendet: number; geloescht: number }[] }) {
  const animiert = useAnimiert()
  return (
    <ChartContainer config={config} className="h-64">
      <BarChart data={daten} margin={{ top: 4, right: 4, left: -16, bottom: 0 }} barGap={2}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="label" tickLine={false} axisLine={false} />
        <YAxis allowDecimals={false} tickLine={false} axisLine={false} tickFormatter={formatZahl} width={40} />
        <ChartTooltip cursor={{ fill: "var(--surface-2)" }} content={(p) => <ChartTooltipContent {...p} />} />
        <ChartLegend content={(p) => <ChartLegendContent payload={p.payload} />} />
        <Bar dataKey="gesendet" fill="var(--color-gesendet)" radius={[4, 4, 0, 0]} maxBarSize={24} isAnimationActive={animiert} />
        <Bar dataKey="geloescht" fill="var(--color-geloescht)" radius={[4, 4, 0, 0]} maxBarSize={24} isAnimationActive={animiert} />
      </BarChart>
    </ChartContainer>
  )
}
