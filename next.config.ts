import type { NextConfig } from "next"
import { sicherheitsHeader } from "./lib/sicherheits-header"

const nextConfig: NextConfig = {
  // CSP, Clickjacking-Schutz (z. B. "Weiter"- oder Passwort-Seiten unsichtbar in
  // einem fremden iframe) und weitere Härtung, siehe lib/sicherheits-header.ts.
  async headers() {
    return [{ source: "/:path*", headers: sicherheitsHeader(process.env) }]
  },
}

export default nextConfig
