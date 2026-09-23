import type { Metadata } from "next"
import { Outfit } from "next/font/google"
import { cookies } from "next/headers"
import "./globals.css"

const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit" })

export const metadata: Metadata = {
  title: "immoheart",
  description: "Vermittlung von Gewerbeimmobilien für espaceSOLOTHURN",
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies()
  const theme = cookieStore.get("immoheart-theme")?.value === "dark" ? "dark" : "light"

  return (
    <html lang="de" data-theme={theme}>
      <body className={`${outfit.variable} font-sans`}>{children}</body>
    </html>
  )
}
