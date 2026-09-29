"use client"

import { useState, type DragEvent } from "react"
import { ArrowLeft, ArrowRight, Trash2 } from "lucide-react"
import type { Foto } from "@/lib/queries/fotos"

type Props = {
  foto: Foto
  index: number
  anzahl: number
  gesperrt: boolean
  gezogen: boolean
  onVerschieben: (von: number, nach: number) => void
  onLoeschen: (id: string) => void
  onZiehStart: (index: number) => void
  onZiehEnde: () => void
  onAblegen: (nach: number) => void
}

const KNOPF =
  "grid size-7 place-items-center rounded-md bg-surface/90 text-ink shadow-sm outline-none hover:bg-surface focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40"

export function FotoKachel({
  foto, index, anzahl, gesperrt, gezogen, onVerschieben, onLoeschen, onZiehStart, onZiehEnde, onAblegen,
}: Props) {
  // Bestätigung direkt in der Kachel statt eines Dialogs: ein Dialog über dem Drawer
  // würde dessen Escape-Handler mitauslösen und den ganzen Drawer schliessen.
  const [bestaetigen, setBestaetigen] = useState(false)
  const [ueber, setUeber] = useState(false)

  function beiUeber(e: DragEvent) {
    if (gesperrt) return
    e.preventDefault()
    setUeber(true)
  }

  return (
    <li
      draggable={!gesperrt && !bestaetigen}
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = "move"
        onZiehStart(index)
      }}
      onDragEnd={onZiehEnde}
      onDragOver={beiUeber}
      onDragLeave={() => setUeber(false)}
      onDrop={(e) => {
        e.preventDefault()
        setUeber(false)
        onAblegen(index)
      }}
      className={`relative overflow-hidden rounded-lg border bg-surface-3 ${ueber ? "border-brand" : "border-line"} ${gezogen ? "opacity-50" : ""} ${gesperrt ? "" : "cursor-grab"}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- öffentliche Storage-URL, kein next/image-Loader konfiguriert */}
      <img src={foto.url} alt={`Foto ${index + 1}`} className="aspect-[4/3] w-full object-cover" draggable={false} />
      {index === 0 && (
        <span className="absolute left-1.5 top-1.5 rounded-full bg-brand px-2 py-0.5 text-[11px] font-medium text-on-brand">
          Titelbild
        </span>
      )}
      {bestaetigen ? (
        <div className="absolute inset-0 grid place-items-center bg-navy/60 p-2 text-center text-xs text-white">
          <div>
            <p className="mb-1.5">Foto löschen?</p>
            <div className="flex justify-center gap-1.5">
              <button
                type="button"
                disabled={gesperrt}
                onClick={() => onLoeschen(foto.id)}
                className="rounded-md bg-crit px-2 py-1 font-medium text-white disabled:opacity-60"
              >
                Löschen
              </button>
              <button
                type="button"
                onClick={() => setBestaetigen(false)}
                className="rounded-md bg-surface px-2 py-1 text-ink"
              >
                Abbrechen
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="absolute bottom-1.5 right-1.5 flex gap-1">
          <button
            type="button"
            aria-label={`Foto ${index + 1} nach vorne`}
            disabled={gesperrt || index === 0}
            onClick={() => onVerschieben(index, index - 1)}
            className={KNOPF}
          >
            <ArrowLeft className="size-4" aria-hidden />
          </button>
          <button
            type="button"
            aria-label={`Foto ${index + 1} nach hinten`}
            disabled={gesperrt || index === anzahl - 1}
            onClick={() => onVerschieben(index, index + 1)}
            className={KNOPF}
          >
            <ArrowRight className="size-4" aria-hidden />
          </button>
          <button
            type="button"
            aria-label={`Foto ${index + 1} löschen`}
            disabled={gesperrt}
            onClick={() => setBestaetigen(true)}
            className={`${KNOPF} text-crit`}
          >
            <Trash2 className="size-4" aria-hidden />
          </button>
        </div>
      )}
    </li>
  )
}
