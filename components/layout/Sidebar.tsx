"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { BarChart3, Building2, ExternalLink, HeartHandshake, Inbox, LogOut, Search } from "lucide-react"
import type { Profil } from "@/types"

const EINTRAEGE = [
  { pfad: "/admin", label: "Matches", Icon: HeartHandshake },
  { pfad: "/admin/postfach", label: "Postfach", Icon: Inbox },
  { pfad: "/admin/anfragen", label: "Anfragen", Icon: Search },
  { pfad: "/admin/objekte", label: "Objekte", Icon: Building2 },
  { pfad: "/admin/zahlen", label: "Zahlen", Icon: BarChart3 },
]

export function Sidebar({ profil, postfachAnzahl }: { profil: Profil; postfachAnzahl: number }) {
  const pfad = usePathname()
  // filter(Boolean) fängt doppelte Leerzeichen und leere Namen ab.
  const initialen =
    profil.name
      .split(" ")
      .map((teil) => teil[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?"

  return (
    <aside className="flex h-screen w-[206px] flex-none flex-col border-r border-line bg-surface">
      <div className="flex items-center gap-2 px-4 pb-3.5 pt-4">
        <span className="font-display text-lg font-bold text-ink">immoheart</span>
      </div>
      <span className="border-b border-line px-4 pb-3.5 text-xs text-ink-3">Admin</span>

      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-2.5">
        {EINTRAEGE.map(({ pfad: ziel, label, Icon }) => {
          const aktiv = pfad === ziel
          return (
            <Link
              key={ziel}
              href={ziel}
              className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm ${
                aktiv ? "bg-brand-soft font-semibold text-brand" : "text-ink-2 hover:bg-surface-2 hover:text-ink"
              }`}
            >
              <Icon className="size-4 opacity-80" aria-hidden />
              {label}
              {ziel === "/admin/postfach" && postfachAnzahl > 0 && (
                <span className="ml-auto rounded-full bg-brand px-1.5 py-0.5 text-[11px] font-semibold text-on-brand">
                  {postfachAnzahl}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      <div className="flex flex-col gap-0.5 border-t border-line p-2.5">
        <a href="/" className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-ink-2 hover:bg-surface-2">
          <ExternalLink className="size-4 opacity-80" aria-hidden />
          Zur Website
        </a>
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

      <div className="flex items-center gap-2.5 border-t border-line px-4 py-3 text-xs text-ink-2">
        <span className="grid h-[27px] w-[27px] place-items-center rounded-full bg-brand text-[11px] font-semibold text-on-brand">
          {initialen}
        </span>
        {profil.name}
      </div>
    </aside>
  )
}
