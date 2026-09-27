"use client"

import { useEffect, useState } from "react"
import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

// Kleine Client-Insel nur für den Scroll-Zustand: ein passiver Listener
// schaltet die Glas-Optik um, sobald mehr als 8px gescrollt wurde. Der
// restliche Header (Logo, Navigation, …) bleibt serverseitig gerendert und
// wird nur als children durchgereicht.
export function GlasHeader({ children }: { children: ReactNode }) {
  const [glasig, setGlasig] = useState(false)

  useEffect(() => {
    function aufScroll() {
      setGlasig(window.scrollY > 8)
    }
    aufScroll()
    window.addEventListener("scroll", aufScroll, { passive: true })
    return () => window.removeEventListener("scroll", aufScroll)
  }, [])

  return (
    <header
      data-glasig={glasig}
      className={cn(
        "sticky top-0 z-40 border-b transition-colors duration-200 motion-reduce:transition-none",
        glasig ? "border-line/70 bg-surface/75 backdrop-blur-md" : "border-transparent bg-surface"
      )}
    >
      {children}
    </header>
  )
}
