import { describe, expect, it } from "vitest"
import { contentSecurityPolicy, sicherheitsHeader } from "./sicherheits-header"

const URL_ = "https://abc.supabase.co"

describe("contentSecurityPolicy", () => {
  it("erlaubt nur das eigene Supabase-Projekt", () => {
    const csp = contentSecurityPolicy({ NEXT_PUBLIC_SUPABASE_URL: URL_ })
    expect(csp).toContain(`connect-src 'self' ${URL_} wss://abc.supabase.co`)
  })

  it("weicht ohne oder mit ungültiger URL auf *.supabase.co aus", () => {
    expect(contentSecurityPolicy({})).toContain("https://*.supabase.co")
    expect(contentSecurityPolicy({ NEXT_PUBLIC_SUPABASE_URL: "kaputt" })).toContain("https://*.supabase.co")
  })

  it("verbietet Einbetten, Plugins und fremde Formularziele", () => {
    const csp = contentSecurityPolicy({ NEXT_PUBLIC_SUPABASE_URL: URL_ })
    expect(csp).toContain("frame-ancestors 'none'")
    expect(csp).toContain("object-src 'none'")
    expect(csp).toContain("base-uri 'self'")
    expect(csp).toContain("form-action 'self'")
  })

  it("erlaubt eval nur im Dev-Server", () => {
    expect(contentSecurityPolicy({ NODE_ENV: "development" })).toContain("'unsafe-eval'")
    expect(contentSecurityPolicy({ NODE_ENV: "production" })).not.toContain("'unsafe-eval'")
  })

  it("lässt vercel.live nur auf Previews zu", () => {
    expect(contentSecurityPolicy({ VERCEL_ENV: "preview" })).toContain("https://vercel.live")
    expect(contentSecurityPolicy({ VERCEL_ENV: "production" })).not.toContain("vercel.live")
  })
})

describe("sicherheitsHeader", () => {
  it("setzt alle Härtungs-Header", () => {
    const namen = sicherheitsHeader({}).map((h) => h.key)
    expect(namen).toEqual([
      "Content-Security-Policy", "X-Frame-Options", "X-Content-Type-Options",
      "Referrer-Policy", "Permissions-Policy", "Strict-Transport-Security",
    ])
  })
})
