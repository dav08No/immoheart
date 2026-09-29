"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/Button"
import { StatusChip } from "@/components/ui/StatusChip"
import { Tabelle } from "@/components/ui/Tabelle"
import { initialen } from "@/lib/ui/initialen"
import { kontoStatusTon } from "@/lib/ui/status-ton"
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
    // min-w: Aktionen und Haken behalten ihren Platz; unter sm scrollt die Tabelle
    // in sich (erste Spalte bleibt stehen), die Seite selbst nie.
    <Tabelle ariaLabel="Konten" minBreite="min-w-[560px]">
      <thead>
        <tr>
          <th>Konto</th>
          <th>Status</th>
          <th>darf Nutzer anlegen</th>
          <th>
            <span className="sr-only">Aktionen</span>
          </th>
        </tr>
      </thead>
      <tbody>
        {konten.map((k) => {
          const selbst = k.userId === eigeneUserId
          const sperre = laufend !== null
          return (
            <tr key={k.userId}>
              {/* max-sm-Breite: die fixierte erste Spalte darf auf 360 px nicht alles verdecken. */}
              <td className="max-sm:max-w-36">
                <div className="flex min-w-0 items-center gap-3">
                  <span
                    aria-hidden
                    className="hidden size-8 flex-none place-items-center rounded-full bg-brand-soft text-xs font-semibold text-brand sm:grid"
                  >
                    {initialen(k.name)}
                  </span>
                  <div className="min-w-0">
                    <div className="font-medium text-ink wrap-anywhere">
                      {k.name} {selbst && <span className="text-xs font-normal text-ink-2">(Sie)</span>}
                    </div>
                    <div className="text-xs text-ink-2 wrap-anywhere">{k.email}</div>
                  </div>
                </div>
              </td>
              <td>
                <StatusChip ton={kontoStatusTon(k.status)}>{STATUS_TEXT[k.status]}</StatusChip>
              </td>
              <td>
                <label className="inline-flex items-center gap-1.5 text-xs text-ink-2">
                  <input
                    type="checkbox"
                    checked={k.darfNutzerAnlegen}
                    disabled={sperre || selbst}
                    onChange={(e) => void ausfuehren(k.userId, () => setzeNutzerRecht(k.userId, e.target.checked), "Recht gespeichert")}
                    className="size-4 accent-brand disabled:cursor-not-allowed"
                  />
                  <span className="sr-only">{k.name} darf Nutzer anlegen</span>
                </label>
              </td>
              <td>
                <div className="flex flex-wrap justify-end gap-2">
                  {/* status "eingeladen" leitet sich aus last_sign_in_at ab, das verifyOtp
                      schon beim Linkaufruf setzt -- wer nie ein Passwort gespeichert hat,
                      gilt sonst als "aktiv" und würde den Knopf verlieren. */}
                  {!selbst && k.status !== "deaktiviert" && (
                    <Button disabled={sperre} onClick={() => void ausfuehren(k.userId, () => einladungErneutSenden(k.userId), "Link gesendet")}>
                      Link senden
                    </Button>
                  )}
                  {!selbst &&
                    (k.status === "deaktiviert" ? (
                      <Button disabled={sperre} onClick={() => void ausfuehren(k.userId, () => kontoReaktivieren(k.userId), "Konto reaktiviert")}>
                        Reaktivieren
                      </Button>
                    ) : (
                      <Button
                        variante="gefaehrlich"
                        disabled={sperre}
                        onClick={() => void ausfuehren(k.userId, () => kontoDeaktivieren(k.userId), "Konto deaktiviert")}
                      >
                        Deaktivieren
                      </Button>
                    ))}
                </div>
              </td>
            </tr>
          )
        })}
      </tbody>
    </Tabelle>
  )
}
