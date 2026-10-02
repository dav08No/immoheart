"use client"

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/shadcn/dialog"
import { Button } from "@/components/ui/Button"

// Bleibt nach dem Schliessen gesetzt, damit der Text während der Ausblende-Animation steht.
export type DialogInhalt = { frage: string; folgen: string; label: string }

type Props = {
  offen: boolean
  inhalt: DialogInhalt | null
  laufend: boolean
  onBestaetigen: () => void
  onAbbrechen: () => void
  // Fokus nach dem Schliessen steuert der Aufrufer (der auslösende Knopf kann weg sein).
  onFokusNachSchliessen: (ereignis: Event) => void
}

// Jede Abschluss-Aktion (Treffer oder Objekt) wird bestätigt, und der Dialog nennt die Folgen (Spec §1).
export function AbschlussDialog({ offen, inhalt, laufend, onBestaetigen, onAbbrechen, onFokusNachSchliessen }: Props) {
  return (
    <Dialog open={offen} onOpenChange={(auf) => !auf && !laufend && onAbbrechen()}>
      <DialogContent onCloseAutoFocus={onFokusNachSchliessen} showCloseButton={!laufend}>
        {inhalt && (
          <>
            <DialogHeader>
              <DialogTitle>{inhalt.frage}</DialogTitle>
              <DialogDescription className="text-ink-2 wrap-break-word">{inhalt.folgen}</DialogDescription>
            </DialogHeader>
            {/* Primäraktion rechts (Ruling R3); auf dem Handy dank flex-col-reverse oben. */}
            <DialogFooter>
              <Button onClick={onAbbrechen} disabled={laufend}>
                Abbrechen
              </Button>
              <Button variante="primaer" onClick={onBestaetigen} disabled={laufend}>
                {laufend ? "Wird ausgeführt…" : inhalt.label}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
