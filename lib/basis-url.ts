import type { LinkTyp } from "./routen"

const PRODUCTION = "https://immoheart.vercel.app"
// Einladungs- und Reset-Links zeigen auf die Umgebung, aus der sie ausgelöst
// wurden (Preview testet Preview). Der Host kommt aus dem Request-Header und ist
// damit vom Aufrufer beeinflussbar -- nur bekannte Hosts werden übernommen,
// sonst könnte ein manipulierter Host-Header Links auf eine fremde Domain erzeugen.
const ERLAUBTE_HOSTS = [
  /^localhost(:\d+)?$/,
  /^immoheart\.vercel\.app$/,
  /^immoheart-[a-z0-9-]+-davides-projects-e3ca110b\.vercel\.app$/,
]

export function basisUrl(host: string | null, proto: string | null): string {
  if (!host || !ERLAUBTE_HOSTS.some((muster) => muster.test(host))) return PRODUCTION
  const istLokal = host.startsWith("localhost")
  return `${istLokal && proto === "http" ? "http" : "https"}://${host}`
}

export function bestaetigungsLink(basis: string, tokenHash: string, typ: LinkTyp): string {
  return `${basis}/auth/bestaetigen?token_hash=${encodeURIComponent(tokenHash)}&typ=${typ}`
}
