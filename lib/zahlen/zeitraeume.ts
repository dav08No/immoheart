// Zeit-Buckets für die Kennzahlen -- alles rein (kein Intl-Output, der zwischen
// Server (Vercel, TZ=UTC) und Client abweicht). Intl.DateTimeFormat wird nur
// benutzt, um numerische Y/M/D-Teile in Europe/Zurich auszulesen (formatToParts
// liefert deterministische Werte); Labels selbst bauen wir aus festen deutschen
// Kürzeln zusammen, nie aus Intl-formatierten Strings.

function zuercherTeile(datum: Date): { jahr: number; monat: number; tag: number } {
  const teile = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Zurich",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(datum)
  const wert = (typ: string): number => Number(teile.find((t) => t.type === typ)?.value ?? "0")
  return { jahr: wert("year"), monat: wert("month"), tag: wert("day") }
}

export function monatSchluessel(datum: Date): string {
  const { jahr, monat } = zuercherTeile(datum)
  return `${jahr}-${String(monat).padStart(2, "0")}`
}

const MONAT_KUERZEL = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"] as const

export function monatLabel(schluessel: string): string {
  const jahr = Number(schluessel.slice(0, 4))
  const monat = Number(schluessel.slice(5, 7))
  const kuerzel = MONAT_KUERZEL[monat - 1] ?? "?"
  return `${kuerzel} ${String(jahr % 100).padStart(2, "0")}`
}

// Liste der letzten `anzahl` Monatsschlüssel, älteste zuerst, endend beim Monat
// von `jetzt`. Rechnet mit einer durchlaufenden Monatszahl (jahr*12+monat-1),
// damit der Jahreswechsel keine Sonderfallbehandlung braucht.
export function letzteMonate(jetzt: Date, anzahl: number): string[] {
  const { jahr, monat } = zuercherTeile(jetzt)
  const ergebnis: string[] = []
  for (let i = anzahl - 1; i >= 0; i--) {
    const laufend = jahr * 12 + (monat - 1) - i
    const j = Math.floor(laufend / 12)
    const m = laufend - j * 12 + 1
    ergebnis.push(`${j}-${String(m).padStart(2, "0")}`)
  }
  return ergebnis
}

// ISO-8601-Woche aus einem reinen Kalenderdatum (kein Zeitzonen-Bezug mehr nötig,
// da jahr/monat/tag bereits die Zürcher Lokaltag-Werte sind). Standardalgorithmus:
// auf den Donnerstag derselben Woche springen, dessen Jahr bestimmt das ISO-Jahr
// (löst 53/1-Übergänge korrekt, z.B. 1.1.2021 -> Woche 53/2020).
function isoWocheVonDatum(jahr: number, monat: number, tag: number): { isoJahr: number; woche: number } {
  const datum = new Date(Date.UTC(jahr, monat - 1, tag))
  const wochentag = datum.getUTCDay() || 7 // Mo=1..So=7
  datum.setUTCDate(datum.getUTCDate() + 4 - wochentag)
  const jahresBeginn = new Date(Date.UTC(datum.getUTCFullYear(), 0, 1))
  const woche = Math.ceil(((datum.getTime() - jahresBeginn.getTime()) / 86_400_000 + 1) / 7)
  return { isoJahr: datum.getUTCFullYear(), woche }
}

export function isoWocheSchluessel(datum: Date): string {
  const { jahr, monat, tag } = zuercherTeile(datum)
  const { isoJahr, woche } = isoWocheVonDatum(jahr, monat, tag)
  return `${isoJahr}-W${String(woche).padStart(2, "0")}`
}

export function wocheLabel(schluessel: string): string {
  const woche = Number(schluessel.slice(6)) // nach "YYYY-W"
  return `KW ${woche}`
}

// Liste der letzten `anzahl` ISO-Wochenschlüssel, älteste zuerst. Arbeitet auf dem
// als UTC-Mitternacht kodierten Zürcher Kalendertag -- reine Kalender-Tagesarithmetik
// (minus 7 Tage), keine Zeitzonen-Neuberechnung pro Schritt nötig.
export function letzteWochen(jetzt: Date, anzahl: number): string[] {
  const { jahr, monat, tag } = zuercherTeile(jetzt)
  const basis = Date.UTC(jahr, monat - 1, tag)
  const ergebnis: string[] = []
  for (let i = anzahl - 1; i >= 0; i--) {
    const datum = new Date(basis - i * 7 * 86_400_000)
    const { isoJahr, woche } = isoWocheVonDatum(datum.getUTCFullYear(), datum.getUTCMonth() + 1, datum.getUTCDate())
    ergebnis.push(`${isoJahr}-W${String(woche).padStart(2, "0")}`)
  }
  return ergebnis
}
