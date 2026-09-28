"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { usePathname, useRouter } from "next/navigation"
import { toast } from "sonner"
import { NEUE_MAILS_EREIGNIS, zeigeMailToast, type NeueMailsDetail } from "@/lib/neue-mails-ereignis"
import type { Profil } from "@/types"

type AdminNav = { profil: Profil; postfachAnzahl: number; entwurfAnzahl: number; herzschlagNr: number }

const Kontext = createContext<AdminNav | null>(null)

// Seitenleiste (Desktop) und Menü-Sheet (Handy) teilen Profil, Zähler und
// Herzschlag. Der Mail-Listener lebt deshalb genau einmal hier -- in beiden
// Navigationen registriert, gäbe es bei offenem Sheet doppelte Toasts.
export function AdminNavAnbieter({
  profil,
  postfachAnzahl,
  entwurfAnzahl,
  children,
}: Omit<AdminNav, "herzschlagNr"> & { children: ReactNode }) {
  const pfad = usePathname()
  const router = useRouter()
  // Zählt Ereignisse statt nur boolean an/aus: als React-`key` erzwingt eine
  // Änderung einen Remount von Herz-Icon/Badge, was die (nicht-endlose, siehe
  // globals.css) CSS-Animation zuverlässig neu startet.
  const [herzschlagNr, setHerzschlagNr] = useState(0)

  useEffect(() => {
    function beiNeueMails(ereignis: Event) {
      const { neu } = (ereignis as CustomEvent<NeueMailsDetail>).detail
      setHerzschlagNr((nr) => nr + 1)
      if (!zeigeMailToast(pfad)) return
      toast(neu === 1 ? "1 neue Mail" : `${neu} neue Mails`, {
        action: { label: "Postfach öffnen", onClick: () => router.push("/admin/postfach") },
      })
    }
    window.addEventListener(NEUE_MAILS_EREIGNIS, beiNeueMails)
    return () => window.removeEventListener(NEUE_MAILS_EREIGNIS, beiNeueMails)
  }, [pfad, router])

  return (
    <Kontext.Provider value={{ profil, postfachAnzahl, entwurfAnzahl, herzschlagNr }}>{children}</Kontext.Provider>
  )
}

// null ausserhalb von /admin (z.B. falls Header woanders gerendert wird).
export function useAdminNav(): AdminNav | null {
  return useContext(Kontext)
}
