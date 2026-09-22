import type { Metadata } from "next"
import { Outfit } from "next/font/google"
import "./globals.css"

const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit" })

export const metadata: Metadata = {
  title: "PULS",
  description: "Vermittlung von Gewerbeimmobilien für espaceSOLOTHURN",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body className={`${outfit.variable} font-sans`}>{children}</body>
    </html>
  )
}
