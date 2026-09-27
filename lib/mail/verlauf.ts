const MAX_REFERENZEN = 10
const MAX_BETREFF = 200

export function verlaufsKoepfe(bisherigeIds: string[]): { inReplyTo: string | null; referenzen: string | null } {
  if (bisherigeIds.length === 0) return { inReplyTo: null, referenzen: null }
  // Mailprogramme bauen den Verlauf aus In-Reply-To und References; eine
  // begrenzte Kette reicht und hält den Header kurz.
  return {
    inReplyTo: bisherigeIds[bisherigeIds.length - 1] ?? null,
    referenzen: bisherigeIds.slice(-MAX_REFERENZEN).join(" "),
  }
}

export function antwortBetreff(betreff: string): string {
  const bereinigt = betreff.trim()
  const mitPraefix = /^(re|aw|wg):/i.test(bereinigt) ? bereinigt : `Re: ${bereinigt}`
  return mitPraefix.slice(0, MAX_BETREFF)
}
