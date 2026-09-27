import { duplikatNeuImportieren, type BestehenderEingang } from "./eingang"

// Abgeholt wird nach Datum statt nach "ungelesen": eine Mail, die jemand zuerst in
// Gmail öffnet, würde sonst nie in immoheart ankommen. Doppelte erkennt die Message-ID.
export const ABRUF_FENSTER_TAGE = 3

export type Kandidat = { uid: number; messageId: string }

export function abrufSeit(jetztMs: number): Date {
  return new Date(jetztMs - ABRUF_FENSTER_TAGE * 24 * 60 * 60 * 1000)
}

// Ohne Message-ID-Header gäbe es kein Merkmal gegen Doppelimporte; UIDVALIDITY + UID
// ist pro Postfach eindeutig und bleibt über Abrufe hinweg gleich.
export function ersatzMessageId(uidValidity: string, uid: number): string {
  return `<imap-${uidValidity}-${uid}@immoheart.local>`
}

// Älteste zuerst, damit ein Rückstand der Reihe nach abgearbeitet wird. Bekannte Mails
// werden übersprungen, ausser ein früherer Import ist mittendrin abgebrochen.
export function waehleZuImportieren(
  kandidaten: Kandidat[],
  bekannt: Map<string, BestehenderEingang>,
  max: number
): Kandidat[] {
  return kandidaten
    .filter((k) => {
      const bestehend = bekannt.get(k.messageId)
      return !bestehend || duplikatNeuImportieren(bestehend)
    })
    .sort((a, b) => a.uid - b.uid)
    .slice(0, max)
}
