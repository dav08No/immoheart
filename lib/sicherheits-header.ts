// Sicherheits-Header für alle Antworten (next.config.ts). Reine Funktion, damit die
// CSP ohne Build testbar ist.

// Fallback, falls die Variable beim Build fehlt: alle Supabase-Projekte statt gar keins.
const SUPABASE_FALLBACK = "https://*.supabase.co"

function supabaseUrsprung(url: string | undefined): string {
  if (!url) return SUPABASE_FALLBACK
  try {
    return new URL(url).origin
  } catch {
    return SUPABASE_FALLBACK
  }
}

export function contentSecurityPolicy(env: {
  NODE_ENV?: string
  VERCEL_ENV?: string
  NEXT_PUBLIC_SUPABASE_URL?: string
  [key: string]: string | undefined
}): string {
  const supabase = supabaseUrsprung(env.NEXT_PUBLIC_SUPABASE_URL)
  const supabaseWs = supabase.replace(/^https:/, "wss:")
  // Vercel blendet auf Previews die Toolbar (vercel.live) ein; in Produktion nicht nötig.
  const vercelLive = env.VERCEL_ENV === "preview" ? " https://vercel.live" : ""
  // 'unsafe-inline' für Skripte: Next.js rendert Inline-Skripte ohne Nonce (dafür müsste
  // jede Seite dynamisch über die Middleware laufen). 'unsafe-eval' nur für den Dev-Server.
  const eval_ = env.NODE_ENV === "development" ? " 'unsafe-eval'" : ""

  return [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline'${eval_}${vercelLive}`,
    "style-src 'self' 'unsafe-inline'",
    // Objekt- und Firmenbilder können aus Storage oder von freien https-URLs stammen.
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    `connect-src 'self' ${supabase} ${supabaseWs}${vercelLive}`,
    // Lagekarte auf der Objektseite.
    `frame-src https://www.google.com https://maps.google.com${vercelLive}`,
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join("; ")
}

export function sicherheitsHeader(env: Parameters<typeof contentSecurityPolicy>[0]): { key: string; value: string }[] {
  return [
    { key: "Content-Security-Policy", value: contentSecurityPolicy(env) },
    // Ältere Browser kennen frame-ancestors nicht.
    { key: "X-Frame-Options", value: "DENY" },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
    { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  ]
}
