import type { Metadata } from "next"
import { Hanken_Grotesk } from "next/font/google"
import { cookies } from "next/headers"
import { Toaster } from "@/components/shadcn/sonner"
import { oeffentlicheBasisUrl } from "@/lib/basis-url"
import { OPEN_GRAPH_BASIS } from "@/lib/open-graph"
import "./globals.css"

// Freie Verwandte von Halyard, der Hausschrift von espaceSOLOTHURN.
const hanken = Hanken_Grotesk({ subsets: ["latin"], variable: "--font-hanken" })

export const metadata: Metadata = {
  // Löst relative og:image-URLs (z. B. das generierte opengraph-image) in
  // absolute Links auf -- ohne metadataBase blieben sie relativ und würden von
  // Plattformen wie WhatsApp/LinkedIn nicht geladen.
  metadataBase: new URL(oeffentlicheBasisUrl(process.env)),
  title: { default: "immoheart", template: "%s · immoheart" },
  description: "Gewerbeflächen in der Region Solothurn, persönlich vermittelt.",
  // Auf der Root-Ebene, weil Next das dateibasierte opengraph-image nur hier
  // zusammenführt; Seiten ohne eigenes openGraph erben so Bild, siteName und locale.
  openGraph: { ...OPEN_GRAPH_BASIS },
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies()
  const theme = cookieStore.get("immoheart-theme")?.value === "dark" ? "dark" : "light"

  return (
    <html lang="de" data-theme={theme}>
      <body className={`${hanken.variable} font-sans`}>
        {children}
        {/* Oben statt unten rechts: dort liegen die Knöpfe der Sheet-Fusszeilen. */}
        <Toaster position="top-center" />
      </body>
    </html>
  )
}
