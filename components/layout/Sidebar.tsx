"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { toast } from "sonner"
import { BarChart3, Building2, ExternalLink, Heart, HeartHandshake, Inbox, LogOut, PenLine, Search, Users } from "lucide-react"
import { cn } from "@/lib/utils"
import { NEUE_MAILS_EREIGNIS, zeigeMailToast, type NeueMailsDetail } from "@/lib/neue-mails-ereignis"
import type { Profil } from "@/types"

const EINTRAEGE = [
  { pfad: "/admin", label: "Matches", Icon: HeartHandshake },
  { pfad: "/admin/postfach", label: "Postfach", Icon: Inbox },
  { pfad: "/admin/entwuerfe", label: "Entwürfe", Icon: PenLine },
  { pfad: "/admin/anfragen", label: "Anfragen", Icon: Search },
  { pfad: "/admin/objekte", label: "Objekte", Icon: Building2 },
  { pfad: "/admin/zahlen", label: "Zahlen", Icon: BarChart3 },
]

export function Sidebar({
  profil,
  postfachAnzahl,
  entwurfAnzahl,
}: {
  profil: Profil
  postfachAnzahl: number
  entwurfAnzahl: number
}) {
  const pfad = usePathname()
  const router = useRouter()
  // Zählt Ereignisse statt nur boolean an/aus: als React-`key` unten erzwingt eine
  // Änderung einen Remount des Herz-Icons/Badges, was die (nicht-endlose, siehe
  // globals.css) CSS-Animation zuverlässig neu startet -- ein zweites "neue Mails"-
  // Ereignis mitten in der ersten Animation würde sonst ignoriert.
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
    <aside className="flex h-screen w-[206px] flex-none flex-col border-r border-line bg-surface">
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
          // Sub-Routen desselben Bereichs (z.B. eine künftige /admin/objekte/<id>)
          // sollen den Eltern-Eintrag ebenfalls aktiv markieren -- "/admin" selbst
          // ist ausgenommen, sonst wäre er wegen des gemeinsamen Präfixes für
          // JEDE Admin-Seite aktiv.
          const aktiv = pfad === ziel || (ziel !== "/admin" && pfad.startsWith(ziel + "/"))
          const badge = badges[ziel] ?? 0
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
        <Link href="/" className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-ink-2 hover:bg-surface-2">
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
        className="flex items-center gap-2.5 border-t border-line px-4 py-3 text-xs text-ink-2 hover:bg-surface-2"
      >
        <span className="grid h-[27px] w-[27px] place-items-center rounded-full bg-brand text-[11px] font-semibold text-on-brand">
          {initialen}
        </span>
        {profil.name}
      </Link>
    </aside>
  )
}
