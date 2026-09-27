"use client"

import { useEffect, useState } from "react"
import { Download, FileText, ImageOff, Loader2 } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/shadcn/dialog"
import { anhangLinks } from "@/app/actions/postfach"
import type { AnhangLink } from "@/lib/queries/postfach"

type Laden = { status: "laedt" } | { status: "fertig"; links: AnhangLink[] } | { status: "fehler"; text: string }

const LINK = "inline-flex items-center gap-1 text-xs text-brand hover:underline focus-visible:outline-2 focus-visible:outline-ring"

function groesseText(bytes: number): string {
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function DownloadLink({ link }: { link: AnhangLink }) {
  return (
    <a href={link.downloadUrl} className={LINK} aria-label={`${link.dateiname} herunterladen`}>
      <Download className="size-3.5" aria-hidden />
      Download
    </a>
  )
}

type Props = { nachrichtId: string; anzahl: number; nichtGespeichert: string[] }

// Wird mit key={nachricht.id} gerendert (EingangDetail) -- ein Wechsel lädt frische
// signierte URLs (10 Min. gültig) statt veraltete weiterzuverwenden.
export function AnhangGalerie({ nachrichtId, anzahl, nichtGespeichert }: Props) {
  const [laden, setLaden] = useState<Laden>({ status: "laedt" })
  const [gross, setGross] = useState<AnhangLink | null>(null)
  // HEIC u.ä. zeigen viele Browser nicht an -- dann Platzhalter statt kaputtem Bild.
  const [ohneVorschau, setOhneVorschau] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (anzahl === 0) return
    let abgebrochen = false
    anhangLinks(nachrichtId)
      .then((ergebnis) => {
        if (abgebrochen) return
        setLaden(ergebnis.fehler ? { status: "fehler", text: ergebnis.fehler } : { status: "fertig", links: ergebnis.links })
      })
      .catch(() => {
        if (!abgebrochen) setLaden({ status: "fehler", text: "Anhänge konnten nicht geladen werden." })
      })
    return () => {
      abgebrochen = true
    }
  }, [nachrichtId, anzahl])

  if (anzahl === 0 && nichtGespeichert.length === 0) return null
  const links = laden.status === "fertig" ? laden.links : []
  const bilder = links.filter((l) => l.mime_type.startsWith("image/"))
  const pdfs = links.filter((l) => !l.mime_type.startsWith("image/"))

  return (
    <section aria-label="Anhänge" className="mt-4 flex flex-col gap-2.5">
      <div className="border-b border-line pb-1.5 text-xs text-ink-3">Anhänge</div>
      {anzahl > 0 && laden.status === "laedt" && (
        <p className="flex items-center gap-1.5 text-xs text-ink-3">
          <Loader2 className="size-3.5 animate-spin" aria-hidden /> Anhänge werden geladen…
        </p>
      )}
      {laden.status === "fehler" && anzahl > 0 && <p className="text-xs text-crit">{laden.text}</p>}
      {bilder.length > 0 && (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {bilder.map((bild) => (
            <div key={bild.id} className="flex flex-col gap-1">
              <button
                type="button"
                onClick={() => setGross(bild)}
                aria-label={`${bild.dateiname} gross anzeigen`}
                className="aspect-square overflow-hidden rounded-lg border border-line bg-surface-2 focus-visible:outline-2 focus-visible:outline-ring"
              >
                {ohneVorschau.has(bild.id) ? (
                  <span className="grid size-full place-items-center text-ink-3"><ImageOff className="size-5" aria-hidden /></span>
                ) : (
                  // Plain <img>: signierte Supabase-URLs wechseln ständig, next/image bräuchte
                  // dafür eine remotePatterns-Konfiguration und würde sie nur neu cachen.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={bild.url}
                    alt={bild.dateiname}
                    className="size-full object-cover"
                    onError={() => setOhneVorschau((alt) => new Set(alt).add(bild.id))}
                  />
                )}
              </button>
              <span className="truncate text-[11px] text-ink-3" title={bild.dateiname}>{bild.dateiname}</span>
              <DownloadLink link={bild} />
            </div>
          ))}
        </div>
      )}
      {pdfs.map((pdf) => (
        <div key={pdf.id} className="flex items-center gap-2 rounded-lg border border-line px-3 py-2">
          <FileText className="size-4 flex-none text-ink-3" aria-hidden />
          <a href={pdf.url} target="_blank" rel="noopener noreferrer" className="min-w-0 flex-1 truncate text-sm text-brand hover:underline">
            {pdf.dateiname}
          </a>
          <span className="flex-none text-[11px] text-ink-3">{groesseText(pdf.groesse)}</span>
          <DownloadLink link={pdf} />
        </div>
      ))}
      {nichtGespeichert.length > 0 && (
        <p className="text-xs text-ink-3">
          Nicht übernommen (nur Name): {nichtGespeichert.join(", ")}
        </p>
      )}
      <Dialog open={gross !== null} onOpenChange={(offen) => !offen && setGross(null)}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle className="truncate">{gross?.dateiname}</DialogTitle>
            <DialogDescription>{gross ? groesseText(gross.groesse) : ""}</DialogDescription>
          </DialogHeader>
          {gross && (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element -- gleiche Begründung wie oben */}
              <img src={gross.url} alt={gross.dateiname} className="max-h-[70vh] w-full rounded-lg object-contain" />
              <DownloadLink link={gross} />
            </>
          )}
        </DialogContent>
      </Dialog>
    </section>
  )
}
