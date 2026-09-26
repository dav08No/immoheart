import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  // Verhindert Clickjacking (z. B. "Weiter"- oder Passwort-Seiten unsichtbar
  // in einem fremden iframe platziert und per Klick missbraucht).
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
        ],
      },
    ]
  },
}

export default nextConfig
