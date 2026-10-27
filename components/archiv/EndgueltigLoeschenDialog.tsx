"use client"

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/shadcn/dialog"
import { Button } from "@/components/ui/Button"
import type { ArchivZiel } from "./typen"

type Props = {
  offen: boolean
  // Bleibt nach dem Schliessen gesetzt, damit der Text während der Ausblende-Animation steht.
  ziel: ArchivZiel | null
  verstanden: boolean
  laufend: boolean
  onVerstanden: (wert: boolean) => void
  onBestaetigen: () => void
  onAbbrechen: () => void
  onFokusNachSchliessen: (ereignis: Event) => void
}

// Nicht rückgängig zu machen: Warntext laut Spec, Mengen, und erst das angehakte
// Kästchen gibt den gefährlichen Knopf frei. Während der Action ist alles gesperrt.
export function EndgueltigLoeschenDialog(props: Props) {
  const { offen, ziel, verstanden, laufend, onVerstanden, onBestaetigen, onAbbrechen, onFokusNachSchliessen } = props
  return (
    <Dialog open={offen} onOpenChange={(auf) => !auf && !laufend && onAbbrechen()}>
      <DialogContent onCloseAutoFocus={onFokusNachSchliessen} showCloseButton={!laufend}>
        {ziel && (
          <>
            <DialogHeader>
              <DialogTitle className="wrap-break-word">„{ziel.bezeichnung}“ endgültig löschen?</DialogTitle>
              <DialogDescription className="text-ink-2 wrap-break-word">
                Dieser Eintrag wird endgültig gelöscht. Er wird <strong className="text-ink">nicht mehr in den Jahresrapport einbezogen</strong>{" "}
                und kann <strong className="text-ink">nicht wiederhergestellt</strong> werden.
              </DialogDescription>
            </DialogHeader>
            {ziel.mitgeloescht && <p className="text-sm text-ink">{ziel.mitgeloescht}</p>}
            <label className="flex items-center gap-2 text-sm text-ink">
              <input
                type="checkbox"
                checked={verstanden}
                disabled={laufend}
                onChange={(e) => onVerstanden(e.target.checked)}
                className="size-4 accent-crit"
              />
              Ich habe verstanden
            </label>
            {/* Primäraktion rechts (Ruling R3). */}
            <DialogFooter>
              <Button onClick={onAbbrechen} disabled={laufend}>
                Abbrechen
              </Button>
              <Button variante="gefaehrlich" onClick={onBestaetigen} disabled={!verstanden || laufend}>
                {laufend ? "Wird gelöscht…" : "Endgültig löschen"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
