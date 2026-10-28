// Zeitraum des Jahresrapports: heute minus 1 Jahr bis heute, beide Tage, Schweizer Zeit.
import { letzteMonate, monatLabel, zuercherDatum } from "@/lib/zahlen/zeitraeume"

export type RapportZeitraum = {
  von: string // yyyy-mm-dd, Zürcher Kalendertag
  bis: string
  label: string // "27.10.2025 – 27.10.2026"
  monate: { schluessel: string; label: string }[] // 13 Monate, ältester zuerst
  // Untergrenze für die DB-Abfragen; einen Tag früher, weil die DB in UTC vergleicht.
  // Die genaue Grenze zieht imZeitraum() danach in reinem Code.
  abfrageAb: string
}

function alsText(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function deutsch(iso: string): string {
  return `${iso.slice(8, 10)}.${iso.slice(5, 7)}.${iso.slice(0, 4)}`
}

export function rapportZeitraum(jetzt: Date): RapportZeitraum {
  const bis = zuercherDatum(jetzt)
  const jahr = Number(bis.slice(0, 4))
  const monat = Number(bis.slice(5, 7))
  const tag = Number(bis.slice(8, 10))
  // Tag 0 des Folgemonats = letzter Tag des Monats; so wird aus dem 29.02. der 28.02.
  const letzterTag = new Date(Date.UTC(jahr - 1, monat, 0)).getUTCDate()
  const vonDatum = new Date(Date.UTC(jahr - 1, monat - 1, Math.min(tag, letzterTag)))
  const von = alsText(vonDatum)
  return {
    von,
    bis,
    label: `${deutsch(von)} – ${deutsch(bis)}`,
    monate: letzteMonate(jetzt, 13).map((schluessel) => ({ schluessel, label: monatLabel(schluessel) })),
    abfrageAb: alsText(new Date(vonDatum.getTime() - 86_400_000)),
  }
}

// Ein Ereignis zählt, wenn sein Zürcher Kalendertag im Zeitraum liegt (Spec "Zeitraum-Regeln").
export function imZeitraum(zeitraum: Pick<RapportZeitraum, "von" | "bis">, zeitpunkt: string | null): boolean {
  if (!zeitpunkt) return false
  const tag = zuercherDatum(new Date(zeitpunkt))
  return tag >= zeitraum.von && tag <= zeitraum.bis
}

// Spanne in Tagen, eine Nachkommastelle; negative Spannen sind Eingabefehler (wie lib/zahlen).
export function tageZwischen(von: string, bis: string): number | null {
  const tage = (Date.parse(bis) - Date.parse(von)) / 86_400_000
  return tage < 0 ? null : Math.round(tage * 10) / 10
}
