// Reine Helfer der öffentlichen Detailseite (Metadaten, Karte, Eigenschaften):
// kein I/O, darum unit-testbar.
import type { OeffentlichesObjekt } from "@/lib/objektsuche"
import { eigenschaftLabel, formatZahl, nutzungLabel } from "./anzeige"

const MAX_META = 160

export function metaTitel(objekt: Pick<OeffentlichesObjekt, "titel" | "ort">): string {
  return `${objekt.titel} in ${objekt.ort} · immoheart`
}

export function preisText(preisProM2: number | null): string {
  return preisProM2 !== null ? `CHF ${formatZahl(preisProM2)}/m²` : "auf Anfrage"
}

// Beschreibung bevorzugt, sonst die Eckdaten -- nie die Adresse (die gibt es im
// öffentlichen Objekt gar nicht, aber auch nicht aus Versehen zusammensetzen).
export function metaBeschreibung(objekt: OeffentlichesObjekt): string {
  const text = objekt.beschreibung?.replace(/\s+/g, " ").trim()
  if (text) return kuerzen(text, MAX_META)
  const preis = objekt.preis_pro_m2 !== null ? `CHF ${formatZahl(objekt.preis_pro_m2)}/m²` : "Preis auf Anfrage"
  return kuerzen(`${nutzungLabel(objekt.nutzung)} · ${formatZahl(objekt.flaeche)} m² · ${preis} · ${objekt.ort}`, MAX_META)
}

// An einer Wortgrenze kürzen, damit Suchmaschinen kein halbes Wort zeigen.
export function kuerzen(text: string, max: number): string {
  if (text.length <= max) return text
  const schnitt = text.slice(0, max - 1)
  const leer = schnitt.lastIndexOf(" ")
  return `${(leer > max / 2 ? schnitt.slice(0, leer) : schnitt).trimEnd()}…`
}

// Nur der Ortsname: die genaue Adresse ist öffentlich tabu.
export function kartenUrl(ort: string): string {
  return `https://www.google.com/maps?q=${encodeURIComponent(`${ort}, Schweiz`)}&output=embed`
}

// true → nur das Label; Text/Zahl → "Label: Wert"; alles andere (false, leer, Objekte) weg.
export function eigenschaftChips(eigenschaften: Record<string, unknown>): string[] {
  const chips: string[] = []
  for (const [schluessel, wert] of Object.entries(eigenschaften).sort(([a], [b]) => a.localeCompare(b))) {
    if (wert === true) chips.push(eigenschaftLabel(schluessel))
    else if (typeof wert === "number" && Number.isFinite(wert)) chips.push(`${eigenschaftLabel(schluessel)}: ${formatZahl(wert)}`)
    else if (typeof wert === "string" && wert.trim()) chips.push(`${eigenschaftLabel(schluessel)}: ${wert.trim()}`)
  }
  return chips
}

// verfuegbar_ab ist ein reines Kalenderdatum (YYYY-MM-DD); heute ebenso -- ein
// Textvergleich reicht und vermeidet Zeitzonen-Fehler.
export function verfuegbarText(verfuegbarAb: string, heute: string): string {
  if (verfuegbarAb <= heute) return "sofort"
  const [jahr, monat, tag] = verfuegbarAb.split("-")
  return `${tag}.${monat}.${jahr}`
}

// Feste Zone statt Serverzeit (Vercel läuft in UTC): sonst gälte kurz nach
// Mitternacht in der Schweiz noch der Vortag.
export function heuteInZuerich(jetzt: Date): string {
  const teile = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Zurich", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(jetzt)
  const teil = (typ: string): string => teile.find((t) => t.type === typ)?.value ?? ""
  return `${teil("year")}-${teil("month")}-${teil("day")}`
}

export function vorbelegteNachricht(titel: string): string {
  return `Ich interessiere mich für „${titel}“ und bitte um weitere Informationen.`
}
