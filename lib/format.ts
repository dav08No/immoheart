export function formatFlaeche(m2: number): string {
  const gerundet = Math.round(m2).toString()
  const mitApostroph = gerundet.replace(/\B(?=(\d{3})+(?!\d))/g, "'")
  return `${mitApostroph} m²`
}

export function formatPreis(chfProM2: number): string {
  return `CHF ${Math.round(chfProM2)}/m²`
}

export function formatDatum(datum: Date): string {
  // UTC getters, not local getters: objekte.verfuegbar_ab is a pure calendar
  // date with no time component. new Date("2026-08-25") lands on UTC midnight;
  // local getters in a timezone west of UTC would roll back to the previous day.
  const tag = String(datum.getUTCDate()).padStart(2, "0")
  const monat = String(datum.getUTCMonth() + 1).padStart(2, "0")
  const jahr = datum.getUTCFullYear()
  return `${tag}.${monat}.${jahr}`
}

export function formatZeitpunkt(zeitpunkt: Date): string {
  // For real timestamps (created_at, gesendet_am, new Date()) -- do NOT use
  // formatDatum, whose UTC getters would give the wrong calendar day for a
  // timestamp. Explicit IANA timezone instead of local getters, because in
  // production this app runs on a Vercel serverless function with TZ=UTC:
  // "local" there would be identical to UTC, so the bug would stay live and
  // unnoticed. formatToParts reads out only individual numeric fields, not
  // the separator string ICU assembles -- so this isn't the same risk that
  // rules out Intl.NumberFormat above.
  const teile = new Intl.DateTimeFormat("de-CH", {
    timeZone: "Europe/Zurich",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).formatToParts(zeitpunkt)
  const teilWert = (typ: string): string => teile.find((t) => t.type === typ)?.value ?? ""
  return `${teilWert("day")}.${teilWert("month")}.${teilWert("year")}`
}
