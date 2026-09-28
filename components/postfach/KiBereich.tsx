"use client"

import { useState } from "react"
import { AlertTriangle, Clock, Loader2 } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/shadcn/dialog"
import { Button } from "@/components/ui/Button"
import { erneutVerarbeiten, kategorieAendern } from "@/app/actions/eingang"
import { chipVon, kiAnzeige, KATEGORIE_CHIPS, type KategorieChip } from "@/lib/postfach"
import type { PostfachNachricht } from "@/lib/queries/postfach"
import { AUSWAHL_KLASSE, type AktionAusfuehren } from "./typen"

type Props = { nachricht: PostfachNachricht; laufend: string | null; ausfuehren: AktionAusfuehren }

export function KiBereich({ nachricht, laufend, ausfuehren }: Props) {
  const [neueKategorie, setNeueKategorie] = useState<KategorieChip | null>(null)
  const anzeige = kiAnzeige(nachricht.ki_status)
  const aktuell = chipVon(nachricht.kategorie)
  const gesperrt = laufend !== null || anzeige === "laeuft"
  const neuesLabel = KATEGORIE_CHIPS.find((k) => k.wert === neueKategorie)?.label

  async function bestaetigen() {
    if (!neueKategorie) return
    const kategorie = neueKategorie
    setNeueKategorie(null)
    await ausfuehren("kategorie", () => kategorieAendern(nachricht.id, kategorie), "Kategorie geändert.")
  }

  return (
    <section aria-label="Einordnung" className="mt-4 flex flex-col gap-2 rounded-lg border border-line bg-surface-2 p-3">
      {anzeige === "wartet" && (
        <p className="flex items-center gap-1.5 text-xs text-ink-3">
          <Clock className="size-3.5" aria-hidden /> Noch nicht eingeordnet · „Jetzt abrufen“ ordnet offene Mails ein.
        </p>
      )}
      {anzeige === "laeuft" && (
        <p className="flex items-center gap-1.5 text-xs text-brand" role="status">
          <Loader2 className="size-3.5 animate-spin" aria-hidden /> wird eingeordnet…
        </p>
      )}
      {anzeige === "fehler" && (
        <div className="flex flex-wrap items-center gap-2 text-xs text-crit" role="alert">
          <AlertTriangle className="size-3.5 flex-none" aria-hidden />
          <span className="min-w-0 flex-1 wrap-break-word">{nachricht.ki_fehler ?? "Einordnung fehlgeschlagen."}</span>
          <Button
            disabled={gesperrt}
            onClick={() => void ausfuehren("erneut", () => erneutVerarbeiten(nachricht.id), "Erneut verarbeitet.")}
          >
            {laufend === "erneut" ? "Wird verarbeitet…" : "Erneut verarbeiten"}
          </Button>
        </div>
      )}
      <label className="flex flex-wrap items-center gap-2 text-xs text-ink-3">
        <span>Kategorie</span>
        <select
          value={aktuell ?? ""}
          disabled={gesperrt}
          onChange={(e) => setNeueKategorie(e.target.value as KategorieChip)}
          className={`${AUSWAHL_KLASSE} w-auto py-1 text-xs`}
        >
          <option value="" disabled>
            nicht eingeordnet
          </option>
          {/* Objektanfragen entstehen nur über das Website-Formular (mit Objekt); eine Mail
              lässt sich nicht dazu umwandeln -- die Option dient nur der Anzeige. */}
          {KATEGORIE_CHIPS.map(({ wert, label }) => (
            <option key={wert} value={wert} disabled={wert === "objektanfrage"}>
              {label}
            </option>
          ))}
        </select>
        {laufend === "kategorie" && <Loader2 className="size-3.5 animate-spin text-brand" aria-label="wird geändert" />}
      </label>

      <Dialog open={neueKategorie !== null} onOpenChange={(offen) => !offen && setNeueKategorie(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Kategorie ändern?</DialogTitle>
            <DialogDescription>
              Die Mail wird als „{neuesLabel}“ neu eingeordnet. Dabei kann ein neuer Entwurf entstehen; gesendet
              wird nichts.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setNeueKategorie(null)}>Abbrechen</Button>
            <Button variante="primaer" onClick={() => void bestaetigen()}>
              Ändern
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  )
}
