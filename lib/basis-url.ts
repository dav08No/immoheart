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

// Für Metadaten (metadataBase, sitemap.ts, robots.ts) genügt der Ziel-Host aus
// Vercels eigenen Build-Variablen -- anders als basisUrl() gibt es hier keinen
// Request-Header, aus dem ein Aufrufer den Host manipulieren könnte.
export function oeffentlicheBasisUrl(env: {
  VERCEL_ENV?: string
  VERCEL_PROJECT_PRODUCTION_URL?: string
  VERCEL_URL?: string
  // Erlaubt process.env (NodeJS.ProcessEnv hat ein Indexsignatur) als Argument --
  // ohne das stuft TS die drei optionalen Felder als "weak type" ohne
  // Überschneidung mit ProcessEnv ein und lehnt den Aufruf ab.
  [key: string]: string | undefined
}): string {
  if (env.VERCEL_ENV === "production") {
    return env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${env.VERCEL_PROJECT_PRODUCTION_URL}` : PRODUCTION
  }
  if (env.VERCEL_URL) return `https://${env.VERCEL_URL}`
  return "http://localhost:3000"
}
