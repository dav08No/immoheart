import type { Metadata } from "next"
import { Fraunces, Outfit } from "next/font/google"
import { cookies } from "next/headers"
import { Toaster } from "@/components/shadcn/sonner"
import "./globals.css"

const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit" })
const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-fraunces", axes: ["opsz", "SOFT"] })

export const metadata: Metadata = {
  title: { default: "immoheart", template: "%s · immoheart" },
  description: "Gewerbeflächen in der Region Solothurn, persönlich vermittelt.",
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies()
  const theme = cookieStore.get("immoheart-theme")?.value === "dark" ? "dark" : "light"

  return (
    <html lang="de" data-theme={theme}>
      <body className={`${outfit.variable} ${fraunces.variable} font-sans`}>
        {children}
        <Toaster />
      </body>
    </html>
  )
}
