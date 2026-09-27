"use client"

import { useState, type KeyboardEvent } from "react"
import { ChevronLeft, ChevronRight, Expand, Heart, X } from "lucide-react"
import type { OeffentlichesFoto } from "@/lib/queries/oeffentlich"
import { Button } from "@/components/shadcn/button"
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "@/components/shadcn/dialog"

type Props = { fotos: OeffentlichesFoto[]; titel: string }

function bildText(titel: string, i: number, anzahl: number): string {
  return anzahl > 1 ? `${titel} – Bild ${i + 1} von ${anzahl}` : titel
}

export function Galerie({ fotos, titel }: Props) {
  const [gewaehlt, setGewaehlt] = useState(0)
  const [offen, setOffen] = useState(false)
  const anzahl = fotos.length
  // Nach einer Revalidierung kann die Liste kürzer sein: auf das letzte Bild begrenzen.
  const aktiv = Math.min(gewaehlt, Math.max(anzahl - 1, 0))
  const foto = fotos[aktiv]

  if (!foto) {
    return (
      <div className="grid aspect-[16/10] place-items-center rounded-card bg-heart-soft" role="img" aria-label="Noch keine Fotos vorhanden">
        <Heart className="size-14 fill-heart/20 text-heart" aria-hidden />
      </div>
    )
  }

  // Ringförmig blättern: nach dem letzten Bild kommt wieder das erste.
  const blaettern = (schritt: number) => setGewaehlt((aktiv + schritt + anzahl) % anzahl)

  function tasten(e: KeyboardEvent) {
    if (e.key === "ArrowRight") { e.preventDefault(); blaettern(1) }
    if (e.key === "ArrowLeft") { e.preventDefault(); blaettern(-1) }
  }

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        onClick={() => setOffen(true)}
        className="group relative aspect-[16/10] overflow-hidden rounded-card bg-heart-soft outline-none focus-visible:ring-[3px] focus-visible:ring-ring/60"
        aria-label={`${bildText(titel, aktiv, anzahl)} – im Vollbild öffnen`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- öffentliche Storage-URL, kein next/image-Loader konfiguriert */}
        <img src={foto.url} alt="" className="size-full object-cover" />
        <span className="absolute right-3 bottom-3 flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-1 text-xs font-medium text-white">
          <Expand className="size-3.5" aria-hidden />
          {anzahl > 1 ? `${aktiv + 1} / ${anzahl}` : "Vollbild"}
        </span>
      </button>

      {anzahl > 1 && (
        <ul className="flex gap-2 overflow-x-auto pb-1" aria-label="Vorschaubilder">
          {fotos.map((f, i) => (
            <li key={f.id} className="shrink-0">
              <button
                type="button"
                onClick={() => setGewaehlt(i)}
                aria-label={bildText(titel, i, anzahl)}
                aria-current={i === aktiv ? "true" : undefined}
                className="block h-16 w-24 overflow-hidden rounded-md border-2 border-transparent outline-none focus-visible:ring-[3px] focus-visible:ring-ring/60 aria-[current=true]:border-brand"
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- siehe oben */}
                <img src={f.url} alt="" loading="lazy" className="size-full object-cover" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={offen} onOpenChange={setOffen}>
        <DialogContent
          showCloseButton={false}
          onKeyDown={tasten}
          className="flex h-[100dvh] max-h-none w-screen max-w-none flex-col gap-3 rounded-none border-0 bg-black/95 p-3 text-white sm:max-w-none sm:p-6"
        >
          <div className="flex items-center justify-between gap-3">
            <DialogTitle className="truncate text-sm font-medium text-white">{titel}</DialogTitle>
            <DialogDescription className="sr-only">Mit den Pfeiltasten blättern, Escape schliesst das Vollbild.</DialogDescription>
            <div className="flex items-center gap-3">
              {anzahl > 1 && <span className="text-sm tabular-nums text-white/80" aria-live="polite">{aktiv + 1} / {anzahl}</span>}
              <DialogClose asChild>
                <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 hover:text-white" aria-label="Vollbild schliessen">
                  <X aria-hidden />
                </Button>
              </DialogClose>
            </div>
          </div>
          <div className="relative flex min-h-0 flex-1 items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element -- siehe oben */}
            <img src={foto.url} alt={bildText(titel, aktiv, anzahl)} className="max-h-full max-w-full object-contain" />
            {anzahl > 1 && (
              <>
                <Button variant="ghost" size="icon" onClick={() => blaettern(-1)} aria-label="Vorheriges Bild"
                  className="absolute left-0 bg-black/40 text-white hover:bg-black/70 hover:text-white">
                  <ChevronLeft aria-hidden />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => blaettern(1)} aria-label="Nächstes Bild"
                  className="absolute right-0 bg-black/40 text-white hover:bg-black/70 hover:text-white">
                  <ChevronRight aria-hidden />
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
