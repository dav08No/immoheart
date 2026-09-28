"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { BarChart3, Building2, ExternalLink, Heart, HeartHandshake, Inbox, LogOut, PenLine, Search, Users } from "lucide-react"
import { cn } from "@/lib/utils"
import { useAdminNav } from "./AdminNavKontext"

const EINTRAEGE = [
  { pfad: "/admin", label: "Matches", Icon: HeartHandshake },
  { pfad: "/admin/postfach", label: "Postfach", Icon: Inbox },
  { pfad: "/admin/entwuerfe", label: "Entwürfe", Icon: PenLine },
  { pfad: "/admin/anfragen", label: "Anfragen", Icon: Search },
  { pfad: "/admin/objekte", label: "Objekte", Icon: Building2 },
  { pfad: "/admin/zahlen", label: "Zahlen", Icon: BarChart3 },
]

// Gemeinsame Klassen aller Leisten-Einträge: heller Fokusring, weil der
// Standard-Ring (Petrol) auf dem dunklen Verlauf nicht zu sehen wäre.
const EINTRAG =
  "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nav-text"
const INAKTIV = "text-nav-text-2 hover:bg-nav-hover hover:text-nav-text"
// Akzentstrich in nav-akzent statt heart: heart erreicht auf dem Verlauf keine 3:1.
const AKTIV =
  "relative bg-nav-aktiv-bg font-semibold text-nav-text before:absolute before:inset-y-1.5 before:left-0 before:w-[3px] before:rounded-full before:bg-nav-akzent"

// Inhalt der Seitenleiste; auf dem Desktop fest links, auf dem Handy im
// Menü-Sheet (MobilLeiste). onNavigation schliesst dort das Sheet.
export function SidebarInhalt({ onNavigation }: { onNavigation?: () => void }) {
  const pfad = usePathname()
  const nav = useAdminNav()
  if (!nav) return null
  const { profil, postfachAnzahl, entwurfAnzahl, herzschlagNr } = nav

  // filter(Boolean) fängt doppelte Leerzeichen und leere Namen ab.
  const initialen =
    profil.name
      .split(" ")
      .map((teil) => teil[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?"

  const eintraege = profil.darf_nutzer_anlegen ? [...EINTRAEGE, { pfad: "/admin/nutzer", label: "Nutzer", Icon: Users }] : EINTRAEGE
  const badges: Record<string, number> = { "/admin/postfach": postfachAnzahl, "/admin/entwuerfe": entwurfAnzahl }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col bg-linear-to-b from-nav-von to-nav-bis text-nav-text">
      <div className="border-b border-nav-linie px-5 pb-4 pt-5">
        <div className="flex items-center gap-2">
          {/* Sonst ruht das Icon (kein Dauer-Herzschlag wie HerzLogo auf der Website --
              im Admin liefe das den ganzen Tag mit); key erzwingt den Neustart der
              "zweimal kräftig"-Animation bei jedem neuen Ereignis. */}
          <Heart
            key={herzschlagNr}
            className={cn("size-5 fill-nav-akzent text-nav-akzent", herzschlagNr > 0 && "animate-herzschlag-stark")}
            aria-hidden
          />
          <span className="font-display text-xl font-bold text-nav-text">immoheart</span>
        </div>
        <span className="mt-0.5 block pl-7 text-[11px] font-semibold uppercase tracking-[0.14em] text-nav-text-2">Admin</span>
      </div>

      <nav aria-label="Admin-Bereiche" className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
        {eintraege.map(({ pfad: ziel, label, Icon }) => {
          // Sub-Routen desselben Bereichs sollen den Eltern-Eintrag ebenfalls aktiv
          // markieren -- "/admin" selbst ist ausgenommen, sonst wäre er wegen des
          // gemeinsamen Präfixes für JEDE Admin-Seite aktiv.
          const aktiv = pfad === ziel || (ziel !== "/admin" && pfad.startsWith(ziel + "/"))
          const badge = badges[ziel] ?? 0
          return (
            <Link
              key={ziel}
              href={ziel}
              onClick={onNavigation}
              aria-current={aktiv ? "page" : undefined}
              className={cn(EINTRAG, aktiv ? AKTIV : INAKTIV)}
            >
              <Icon className="size-4 flex-none" aria-hidden />
              {label}
              {badge > 0 && (
                <span
                  key={ziel === "/admin/postfach" ? herzschlagNr : undefined}
                  className={cn(
                    "ml-auto rounded-full bg-nav-badge-bg px-1.5 py-0.5 text-[11px] font-semibold text-nav-badge-fg",
                    // Nur das Postfach-Badge pulsiert beim Ereignis -- Entwürfe hat
                    // nichts mit dem Mailabruf zu tun.
                    ziel === "/admin/postfach" && herzschlagNr > 0 && "animate-herzschlag-stark"
                  )}
                >
                  {badge}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      <div className="flex flex-col gap-1 border-t border-nav-linie p-3">
        <Link
          href="/admin/profil"
          onClick={onNavigation}
          aria-current={pfad === "/admin/profil" ? "page" : undefined}
          className={cn(EINTRAG, "mb-1", pfad === "/admin/profil" ? AKTIV : INAKTIV)}
        >
          <span className="grid size-8 flex-none place-items-center rounded-full bg-nav-badge-bg text-xs font-semibold text-nav-badge-fg">
            {initialen}
          </span>
          <span className="min-w-0">
            <span className="block truncate font-medium text-nav-text">{profil.name}</span>
            <span className="block text-xs text-nav-text-2">Profil</span>
          </span>
        </Link>
        <Link href="/" onClick={onNavigation} className={cn(EINTRAG, INAKTIV)}>
          <ExternalLink className="size-4 flex-none" aria-hidden />
          Zur Website
        </Link>
        <form action="/abmelden" method="post">
          <button type="submit" className={cn(EINTRAG, INAKTIV, "w-full")}>
            <LogOut className="size-4 flex-none" aria-hidden />
            Abmelden
          </button>
        </form>
      </div>
    </div>
  )
}

// Feste Seitenleiste erst ab lg; darunter übernimmt das Menü in der MobilLeiste.
export function Sidebar() {
  return (
    <aside className="hidden h-dvh w-[220px] flex-none flex-col lg:flex">
      <SidebarInhalt />
    </aside>
  )
}
