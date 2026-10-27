import { formatZahl } from "@/lib/format"

// Reine Filterlogik der Archiv-Seite (Zeitraum + Suche), getrennt von der Oberfläche,
// damit sie ohne DOM getestet werden kann. "jetzt" kommt vom Server (hydrationssicher).

// "12m" = die letzten 12 Monate bis jetzt (Standard), Zahl = Kalenderjahr.
export type Zeitraum = "12m" | "alles" | number

const JAHR = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Zurich", year: "numeric" })

// Kalenderjahr in Schweizer Zeit: ein Eintrag vom 31.12. 23:30 gehört nicht ins Folgejahr.
export function jahrVon(zeitpunkt: string): number {
  return Number(JAHR.format(new Date(zeitpunkt)))
}

export function imZeitraum(archiviertAm: string, zeitraum: Zeitraum, jetzt: Date): boolean {
  if (zeitraum === "alles") return true
  if (typeof zeitraum === "number") return jahrVon(archiviertAm) === zeitraum
  const grenze = new Date(jetzt)
  grenze.setUTCFullYear(grenze.getUTCFullYear() - 1)
  return new Date(archiviertAm).getTime() >= grenze.getTime()
}

// Nur Jahre mit Daten, neuestes zuerst.
export function jahreMitDaten(zeitpunkte: string[]): number[] {
  return [...new Set(zeitpunkte.map(jahrVon))].sort((a, b) => b - a)
}

export function passtSuche(texte: (string | null)[], suche: string): boolean {
  const nadel = suche.trim().toLocaleLowerCase("de-CH")
  if (nadel === "") return true
  return texte.some((t) => t !== null && t.toLocaleLowerCase("de-CH").includes(nadel))
}

export function filtereArchiv<T extends { archiviert_am: string }>(
  eintraege: T[],
  zeitraum: Zeitraum,
  suche: string,
  texte: (eintrag: T) => (string | null)[],
  jetzt: Date,
): T[] {
  return eintraege.filter((e) => imZeitraum(e.archiviert_am, zeitraum, jetzt) && passtSuche(texte(e), suche))
}

// Durchsucht werden Firma, Objekt und Grund (Spec §1 "Suche nach Firma oder Objekt").
export const SUCHTEXTE = {
  treffer: (t: { firma: string | null; objekt: string | null; grund: string }) => [t.firma, t.objekt, t.grund],
  objekte: (o: { titel: string; ort: string; grund: string | null }) => [o.titel, o.ort, o.grund],
  anfragen: (a: { firma: string | null; eckdaten: string | null; grund: string | null }) => [a.firma, a.eckdaten, a.grund],
}

// Bei Objekten und Anfragen nennt der Lösch-Dialog, was mitgeht; null = nichts weiter.
export function mitgeloeschtText(treffer: number, fotos: number | null): string | null {
  const teile: string[] = []
  if (treffer > 0) teile.push(`${formatZahl(treffer)} ${treffer === 1 ? "archivierter Treffer" : "archivierte Treffer"}`)
  if (fotos !== null && fotos > 0) teile.push(`${formatZahl(fotos)} ${fotos === 1 ? "Foto" : "Fotos"}`)
  return teile.length > 0 ? `Mitgelöscht werden: ${teile.join(" und ")}` : null
}
