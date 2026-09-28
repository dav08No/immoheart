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
    <>
      <div className="flex items-center gap-1.5 px-4 pb-3.5 pt-4">
        {/* Sonst ruht das Icon (kein Dauer-Herzschlag wie HerzLogo auf der Website --
            im Admin liefe das den ganzen Tag mit); key erzwingt den Neustart der
            "zweimal kräftig"-Animation bei jedem neuen Ereignis. */}
        <Heart
          key={herzschlagNr}
          className={cn("size-4 fill-heart text-heart", herzschlagNr > 0 && "animate-herzschlag-stark")}
          aria-hidden
        />
        <span className="font-display text-lg font-bold text-ink">immoheart</span>
      </div>
      <span className="border-b border-line px-4 pb-3.5 text-xs text-ink-3">Admin</span>

      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-2.5">
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
              className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm ${
                aktiv ? "bg-brand-soft font-semibold text-brand" : "text-ink-2 hover:bg-surface-2 hover:text-ink"
              }`}
            >
              <Icon className="size-4 opacity-80" aria-hidden />
              {label}
              {badge > 0 && (
                <span
                  key={ziel === "/admin/postfach" ? herzschlagNr : undefined}
                  className={cn(
                    "ml-auto rounded-full bg-brand px-1.5 py-0.5 text-[11px] font-semibold text-on-brand",
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

      <div className="flex flex-col gap-0.5 border-t border-line p-2.5">
        <Link
          href="/"
          onClick={onNavigation}
          className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-ink-2 hover:bg-surface-2"
        >
          <ExternalLink className="size-4 opacity-80" aria-hidden />
          Zur Website
        </Link>
        <form action="/abmelden" method="post">
          <button
            type="submit"
            className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-ink-2 hover:bg-surface-2"
          >
            <LogOut className="size-4 opacity-80" aria-hidden />
            Abmelden
          </button>
        </form>
      </div>

      <Link
        href="/admin/profil"
        onClick={onNavigation}
        className="flex items-center gap-2.5 border-t border-line px-4 py-3 text-xs text-ink-2 hover:bg-surface-2"
      >
        <span className="grid h-[27px] w-[27px] flex-none place-items-center rounded-full bg-brand text-[11px] font-semibold text-on-brand">
          {initialen}
        </span>
        <span className="min-w-0 truncate">{profil.name}</span>
      </Link>
    </>
  )
}

// Feste Seitenleiste erst ab lg; darunter übernimmt das Menü in der MobilLeiste.
export function Sidebar() {
  return (
    <aside className="hidden h-screen w-[206px] flex-none flex-col border-r border-line bg-surface lg:flex">
      <SidebarInhalt />
    </aside>
  )
}
