import { ImagePlus, Trash2 } from "lucide-react"
import { fotoUebernahme } from "@/lib/postfach"
import type { AnhangLink } from "@/lib/queries/postfach"

const KNOPF =
  "inline-flex items-center gap-1 text-xs hover:underline disabled:cursor-not-allowed disabled:opacity-50 disabled:no-underline focus-visible:outline-2 focus-visible:outline-ring"

type Props = { anhang: AnhangLink; onFoto: () => void; onLoeschen: () => void }

// Aktionen je Anhang: Bild als Objektfoto übernehmen (nur JPEG/PNG/WebP) und löschen.
export function AnhangKnoepfe({ anhang, onFoto, onLoeschen }: Props) {
  const foto = fotoUebernahme(anhang.mime_type)
  return (
    <div className="flex flex-col gap-0.5">
      {foto !== "nein" && (
        <button
          type="button"
          onClick={onFoto}
          disabled={foto === "heic"}
          className={`${KNOPF} text-brand`}
          aria-label={`${anhang.dateiname} als Objektfoto übernehmen`}
        >
          <ImagePlus className="size-3.5" aria-hidden />
          Als Objektfoto
        </button>
      )}
      {foto === "heic" && <span className="text-[11px] text-ink-2">HEIC bitte als JPG speichern</span>}
      <button
        type="button"
        onClick={onLoeschen}
        className={`${KNOPF} text-crit`}
        aria-label={`${anhang.dateiname} löschen`}
      >
        <Trash2 className="size-3.5" aria-hidden />
        Löschen
      </button>
    </div>
  )
}
