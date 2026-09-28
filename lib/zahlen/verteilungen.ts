// Reine Verteilungs-Aggregationen für die Admin-Kennzahlenseite.
import { NUTZUNGEN, nutzungLabel } from "@/lib/nutzung"
import { puls, pulsFarbe } from "@/lib/puls"

// Feste Klassen statt dynamischer Bins -- vergleichbar über die Zeit, unabhängig von
// den tatsächlich vorkommenden Werten. Halboffene Intervalle [min, max), damit jede
// Grenze eindeutig genau einer Klasse zugeordnet ist.
const KLASSEN: [string, number, number][] = [
  ["<200", -Infinity, 200],
  ["200–499", 200, 500],
  ["500–999", 500, 1000],
  ["1000–2499", 1000, 2500],
  ["≥2500", 2500, Infinity],
]

export function groessenVerteilung(anfragen: { flaeche_min: number | null; flaeche_max: number | null }[]): { bereich: string; anzahl: number }[] {
  const zaehler = new Map<string, number>(KLASSEN.map(([bereich]) => [bereich, 0]))
  let unbekannt = 0
  for (const a of anfragen) {
    // Mitte von min/max, wenn beide bekannt sind; sonst der eine bekannte Wert;
    // fehlen beide, ist die Fläche schlicht nicht erfasst ("unbekannt").
    const referenz = a.flaeche_min !== null && a.flaeche_max !== null ? (a.flaeche_min + a.flaeche_max) / 2 : (a.flaeche_min ?? a.flaeche_max)
    if (referenz === null) {
      unbekannt++
      continue
    }
    const klasse = KLASSEN.find(([, min, max]) => referenz >= min && referenz < max)
    if (klasse) zaehler.set(klasse[0], (zaehler.get(klasse[0]) ?? 0) + 1)
  }
  return [...KLASSEN.map(([bereich]) => ({ bereich, anzahl: zaehler.get(bereich) ?? 0 })), { bereich: "unbekannt", anzahl: unbekannt }]
}

export function nutzungVerteilung(anfragen: { nutzung: string }[]): { nutzung: string; label: string; anzahl: number }[] {
  const zaehler = new Map<string, number>()
  const reihenfolge: string[] = [] // Auftrittsreihenfolge für unbekannte Werte -- sonst wäre sie zufällig (Map-Iteration)
  for (const a of anfragen) {
    if (!zaehler.has(a.nutzung)) reihenfolge.push(a.nutzung)
    zaehler.set(a.nutzung, (zaehler.get(a.nutzung) ?? 0) + 1)
  }
  // Bekannte Nutzungen zuerst in fachlicher Reihenfolge (lib/nutzung.ts), unbekannte danach.
  const bekannt = NUTZUNGEN.filter((n) => zaehler.has(n))
  const unbekannt = reihenfolge.filter((n) => !NUTZUNGEN.some((k) => k === n))
  return [...bekannt, ...unbekannt].map((nutzung) => ({
    nutzung,
    label: nutzungLabel(nutzung) ?? nutzung,
    anzahl: zaehler.get(nutzung) ?? 0,
  }))
}

export function pulsVerteilung(offene: { letzter_kontakt: string }[], jetzt: Date): { gut: number; warn: number; kritisch: number } {
  const ergebnis = { gut: 0, warn: 0, kritisch: 0 }
  for (const o of offene) {
    const wert = puls(new Date(o.letzter_kontakt), jetzt)
    ergebnis[pulsFarbe(wert)]++
  }
  return ergebnis
}
