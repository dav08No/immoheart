"use client"

import { Bar, BarChart, CartesianGrid, LabelList, XAxis, YAxis } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/shadcn/chart"
import { formatZahl } from "@/lib/format"
import { useAnimiert } from "./useAnimiert"

// Eine Serie = eine Farbe für alle Balken; kein Legendenkasten (der Kartentitel nennt sie).
const config = { anzahl: { label: "Anzahl", color: "var(--brand)" } } satisfies ChartConfig

const MAX_ZEICHEN = 18

function kuerzen(text: string): string {
  return text.length > MAX_ZEICHEN ? `${text.slice(0, MAX_ZEICHEN - 1)}…` : text
}

// Nullwerte nicht beschriften -- sonst stünde über jeder leeren Klasse eine "0".
function formatiereLabel(wert: unknown): string {
  return typeof wert === "number" && wert > 0 ? formatZahl(wert) : ""
}

// liegend: Kategorien untereinander (lange Namen bleiben lesbar); sonst stehende Säulen.
export function BalkenChart({ daten, liegend = false }: { daten: { label: string; anzahl: number }[]; liegend?: boolean }) {
  const animiert = useAnimiert()
  const tooltip = <ChartTooltip cursor={{ fill: "var(--surface-2)" }} content={(p) => <ChartTooltipContent {...p} />} />
  const wert = <LabelList dataKey="anzahl" position={liegend ? "right" : "top"} formatter={formatiereLabel} className="fill-ink-2" />

  if (liegend) {
    return (
      <ChartContainer config={config} style={{ height: Math.max(120, daten.length * 36 + 16) }}>
        <BarChart data={daten} layout="vertical" margin={{ top: 0, right: 32, left: 0, bottom: 0 }}>
          <XAxis type="number" hide allowDecimals={false} />
          <YAxis type="category" dataKey="label" tickLine={false} axisLine={false} width={120} tickFormatter={kuerzen} />
          {tooltip}
          <Bar dataKey="anzahl" fill="var(--color-anzahl)" radius={[0, 4, 4, 0]} maxBarSize={24} isAnimationActive={animiert}>
            {wert}
          </Bar>
        </BarChart>
      </ChartContainer>
    )
  }
  return (
    <ChartContainer config={config} className="h-56">
      <BarChart data={daten} margin={{ top: 18, right: 4, left: -16, bottom: 0 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="label" tickLine={false} axisLine={false} interval={0} />
        <YAxis allowDecimals={false} tickLine={false} axisLine={false} tickFormatter={formatZahl} width={40} />
        {tooltip}
        <Bar dataKey="anzahl" fill="var(--color-anzahl)" radius={[4, 4, 0, 0]} maxBarSize={24} isAnimationActive={animiert}>
          {wert}
        </Bar>
      </BarChart>
    </ChartContainer>
  )
}
