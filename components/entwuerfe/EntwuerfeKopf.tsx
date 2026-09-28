"use client"

import { useState } from "react"
import { PenLine } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { Seitenkopf } from "@/components/layout/Seitenkopf"
import { kontextEntwuerfe } from "@/lib/admin/kontext"
import { NeueMailDialog } from "./NeueMailDialog"

// Client, weil "Neue Mail" den Dialog oeffnet (State). Seitenkopf wird VOR <main>
// gerendert, kann die (weiter unten liegende) EntwuerfeAnsicht also nicht steuern --
// deshalb lebt der Dialog hier statt dort (wie PostfachKopf/AbrufFehler fuer Postfach).
export function EntwuerfeKopf({ offen }: { offen: number }) {
  const [dialogOffen, setDialogOffen] = useState(false)

  return (
    <>
      <Seitenkopf
        titel="Entwürfe"
        kontext={kontextEntwuerfe(offen)}
        aktion={
          <Button variante="primaer" icon={<PenLine className="size-4" aria-hidden />} onClick={() => setDialogOffen(true)}>
            Neue Mail
          </Button>
        }
        aktionMobil={
          <Button
            variante="primaer"
            className="size-10 px-0"
            aria-label="Neue Mail"
            icon={<PenLine className="size-4" aria-hidden />}
            onClick={() => setDialogOffen(true)}
          />
        }
      />
      <NeueMailDialog offen={dialogOffen} onOpenChange={setDialogOffen} />
    </>
  )
}
