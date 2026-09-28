import type { MetadataRoute } from "next"
import { oeffentlicheBasisUrl } from "@/lib/basis-url"

const PRIVATE_PFADE = ["/admin", "/api", "/auth", "/login", "/passwort-setzen", "/passwort-vergessen", "/abmelden"]

export default function robots(): MetadataRoute.Robots {
  // Preview-Deployments (und lokale Läufe) sollen nie im Index landen, egal
  // welcher Pfad -- sonst würden Testinhalte oder ungeprüfte Branches indexiert.
  if (process.env.VERCEL_ENV !== "production") {
    return { rules: { userAgent: "*", disallow: "/" } }
  }

  const basis = oeffentlicheBasisUrl(process.env)
  return {
    rules: { userAgent: "*", allow: "/", disallow: PRIVATE_PFADE },
    sitemap: `${basis}/sitemap.xml`,
  }
}
