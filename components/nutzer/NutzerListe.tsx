"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Badge } from "@/components/shadcn/badge"
import { Button } from "@/components/ui/Button"
import type { Konto } from "@/lib/queries/nutzer"
import { einladungErneutSenden, kontoDeaktivieren, kontoReaktivieren, setzeNutzerRecht } from "@/app/actions/nutzer"

const STATUS_TEXT: Record<Konto["status"], string> = { eingeladen: "eingeladen", aktiv: "aktiv", deaktiviert: "deaktiviert" }

export function NutzerListe({ konten, eigeneUserId }: { konten: Konto[]; eigeneUserId: string }) {
  const [laufend, setLaufend] = useState<string | null>(null)

  async function ausfuehren(userId: string, aktion: () => Promise<void>, erfolg: string) {
    setLaufend(userId)
    try {
      await aktion()
      toast.success(erfolg)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Aktion fehlgeschlagen")
    } finally {
      setLaufend(null)
    }
  }

  return (
    <div className="flex-1 rounded-card border border-line bg-surface">
      {konten.map((k) => {
        const selbst = k.userId === eigeneUserId
        const sperre = laufend !== null
        return (
          <div key={k.userId} className="flex flex-wrap items-center gap-3 border-b border-line p-3.5 last:border-b-0">
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium text-ink">
                {k.name} {selbst && <span className="text-xs text-ink-3">(Sie)</span>}
              </div>
              <div className="truncate text-xs text-ink-3">{k.email}</div>
            </div>
            <Badge variant={k.status === "deaktiviert" ? "secondary" : "outline"}>{STATUS_TEXT[k.status]}</Badge>
            <label className="flex items-center gap-1.5 text-xs text-ink-2">
              <input
                type="checkbox"
                checked={k.darfNutzerAnlegen}
                disabled={sperre || selbst}
                onChange={(e) => void ausfuehren(k.userId, () => setzeNutzerRecht(k.userId, e.target.checked), "Recht gespeichert")}
              />
              darf Nutzer anlegen
            </label>
            {k.status === "eingeladen" && (
              <Button disabled={sperre} onClick={() => void ausfuehren(k.userId, () => einladungErneutSenden(k.userId), "Einladung gesendet")}>
                Einladung erneut
              </Button>
            )}
            {!selbst &&
              (k.status === "deaktiviert" ? (
                <Button disabled={sperre} onClick={() => void ausfuehren(k.userId, () => kontoReaktivieren(k.userId), "Konto reaktiviert")}>
                  Reaktivieren
                </Button>
              ) : (
                <Button disabled={sperre} onClick={() => void ausfuehren(k.userId, () => kontoDeaktivieren(k.userId), "Konto deaktiviert")}>
                  Deaktivieren
                </Button>
              ))}
          </div>
        )
      })}
    </div>
  )
}
