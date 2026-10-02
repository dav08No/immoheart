"use client"

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/shadcn/dialog"
import { Button } from "@/components/ui/Button"
import { AKTION_FRAGE, AKTION_LABEL, folgenText } from "@/lib/abschluss/folgen-text"
import type { TrefferAktion } from "@/lib/abschluss/uebergaenge"

type Props = {
  offen: boolean
  // Bleibt nach dem Schliessen gesetzt, damit der Text während der Ausblende-Animation steht.
  aktion: TrefferAktion | null
  andereAngebote: number
  laufend: boolean
  onBestaetigen: () => void
  onAbbrechen: () => void
  // Fokus nach dem Schliessen steuert der Aufrufer (der auslösende Knopf kann weg sein).
  onFokusNachSchliessen: (ereignis: Event) => void
}

// Jede Abschluss-Aktion wird bestätigt, und der Dialog nennt die Folgen (Spec §1).
export function AbschlussDialog({ offen, aktion, andereAngebote, laufend, onBestaetigen, onAbbrechen, onFokusNachSchliessen }: Props) {
  return (
    <Dialog open={offen} onOpenChange={(auf) => !auf && !laufend && onAbbrechen()}>
      <DialogContent onCloseAutoFocus={onFokusNachSchliessen} showCloseButton={!laufend}>
        {aktion && (
          <>
            <DialogHeader>
              <DialogTitle>{AKTION_FRAGE[aktion]}</DialogTitle>
              <DialogDescription className="text-ink-2 wrap-break-word">{folgenText(aktion, andereAngebote)}</DialogDescription>
            </DialogHeader>
            {/* Primäraktion rechts (Ruling R3); auf dem Handy dank flex-col-reverse oben. */}
            <DialogFooter>
              <Button onClick={onAbbrechen} disabled={laufend}>
                Abbrechen
              </Button>
              <Button variante="primaer" onClick={onBestaetigen} disabled={laufend}>
                {laufend ? "Wird ausgeführt…" : AKTION_LABEL[aktion]}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
