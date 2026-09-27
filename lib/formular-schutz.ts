// Schutz für öffentliche Formulare (Zeitfalle, IP-Rate-Limit): reine Logik ohne
// Supabase, damit sie ohne DB unit-testbar ist. node:crypto ist laut Aufgabenstellung
// hier ausdrücklich erlaubt (Ausnahme von "keine I/O"-Regel für reine Module).
import { createHmac, timingSafeEqual } from "node:crypto"

export const MINDESTZEIT_MS = 3000
export const LIMIT_PRO_STUNDE = 5

function hmacHex(wert: string, geheimnis: string): string {
  return createHmac("sha256", geheimnis).update(wert).digest("hex")
}

// timingSafeEqual verlangt gleich lange Buffer -- bei Längenunterschied ist die
// Signatur ohnehin falsch, das früh und ohne Seitenkanal zu erkennen reicht.
function hmacGleich(a: string, b: string): boolean {
  const bufA = Buffer.from(a)
  const bufB = Buffer.from(b)
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB)
}

export function erstelleZeitToken(jetztMs: number, geheimnis: string): string {
  const ms = String(jetztMs)
  return `${ms}.${hmacHex(ms, geheimnis)}`
}

export function pruefeZeitToken(token: string, jetztMs: number, geheimnis: string): "ok" | "zu_schnell" | "ungueltig" {
  const teile = token.split(".")
  if (teile.length !== 2) return "ungueltig"
  const [ms, signatur] = teile as [string, string]
  if (!/^\d+$/.test(ms) || !hmacGleich(signatur, hmacHex(ms, geheimnis))) return "ungueltig"

  const vergangen = jetztMs - Number(ms)
  if (vergangen < 0 || vergangen > 24 * 60 * 60 * 1000) return "ungueltig"
  return vergangen >= MINDESTZEIT_MS ? "ok" : "zu_schnell"
}

export function hashIp(ip: string, geheimnis: string): string {
  return hmacHex(ip, geheimnis)
}

export function stundenFenster(jetztMs: number): string {
  const d = new Date(jetztMs)
  d.setUTCMinutes(0, 0, 0)
  return d.toISOString()
}

export function clientIp(kopf: { get(name: string): string | null }): string {
  const weitergeleitet = kopf.get("x-forwarded-for")
  const erste = weitergeleitet?.split(",")[0]?.trim()
  if (erste) return erste
  const real = kopf.get("x-real-ip")?.trim()
  return real || "unbekannt"
}
