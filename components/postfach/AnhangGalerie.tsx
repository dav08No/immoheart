"use client"

import { useRef, useState, type MouseEvent } from "react"
import { Download, FileText, ImageOff, Loader2 } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/shadcn/dialog"
import type { AnhangLink } from "@/lib/queries/postfach"
import { useAnhangLinks } from "./useAnhangLinks"
import { AnhangKnoepfe } from "./AnhangKnoepfe"
import { AnhangLoeschenDialog } from "./AnhangLoeschenDialog"
import { ObjektfotoDialog } from "./ObjektfotoDialog"
import type { ObjektOption } from "./typen"

const LINK = "inline-flex items-center gap-1 text-xs text-brand hover:underline focus-visible:outline-2 focus-visible:outline-ring"

function groesseText(bytes: number): string {
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

type Props = {
  nachrichtId: string
  anzahl: number
  nichtGespeichert: string[]
  objekte: ObjektOption[]
  // Mit der Mail verknüpftes Objekt (Objektangebot/-anfrage) -- im Dialog vorausgewählt.
  objektId: string | null
}

// Wird mit key={nachricht.id} gerendert (EingangDetail) -- ein Wechsel lädt frische
// signierte URLs statt veraltete weiterzuverwenden.
export function AnhangGalerie({ nachrichtId, anzahl, nichtGespeichert, objekte, objektId }: Props) {
  const { laden, neuLaden, frisch, istVeraltet } = useAnhangLinks(nachrichtId, anzahl)
  const [grossId, setGrossId] = useState<string | null>(null)
  const [fotoFuer, setFotoFuer] = useState<AnhangLink | null>(null)
  const [loeschenFuer, setLoeschenFuer] = useState<AnhangLink | null>(null)
  // HEIC u.ä. zeigen viele Browser nicht an -- dann Platzhalter statt kaputtem Bild.
  const [ohneVorschau, setOhneVorschau] = useState<Set<string>>(new Set())
  // Pro Bild genau ein Neuladen nach einem Ladefehler (abgelaufene URL); scheitert es
  // danach erneut, liegt es am Format und der Platzhalter bleibt.
  const nachFehlerNeuGeladen = useRef(new Set<string>())

  if (anzahl === 0 && nichtGespeichert.length === 0) return null
  const links = laden.status === "fertig" ? laden.links : []
  const bilder = links.filter((l) => l.mime_type.startsWith("image/"))
  const pdfs = links.filter((l) => !l.mime_type.startsWith("image/"))
  const gross = links.find((l) => l.id === grossId) ?? null

  function bildFehler(id: string) {
    if (nachFehlerNeuGeladen.current.has(id)) {
      setOhneVorschau((alt) => new Set(alt).add(id))
      return
    }
    nachFehlerNeuGeladen.current.add(id)
    void neuLaden()
  }

  // Nur bei veralteten Links abfangen: dann erst neu signieren, danach öffnen.
  async function linkKlick(e: MouseEvent<HTMLAnchorElement>, id: string, art: "download" | "ansehen") {
    if (!istVeraltet()) return
    e.preventDefault()
    const link = await frisch(id)
    if (!link) return
    if (art === "download") window.location.assign(link.downloadUrl)
    else window.open(link.url, "_blank", "noopener,noreferrer")
  }

  async function grossOeffnen(id: string) {
    if (istVeraltet()) await frisch(id)
    setGrossId(id)
  }

  // Render-Funktion statt verschachtelter Komponente: sonst entstünde bei jedem Render
  // ein neuer Komponententyp und React würde die Links neu mounten.
  function downloadLink(link: AnhangLink) {
    return (
      <a
        href={link.downloadUrl}
        onClick={(e) => void linkKlick(e, link.id, "download")}
        className={LINK}
        aria-label={`${link.dateiname} herunterladen`}
      >
        <Download className="size-3.5" aria-hidden />
        Download
      </a>
    )
  }

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
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {bilder.map((bild) => (
            <div key={bild.id} className="flex min-w-0 flex-col gap-1">
              <button
                type="button"
                onClick={() => void grossOeffnen(bild.id)}
                aria-label={`${bild.dateiname} gross anzeigen`}
                className="aspect-square overflow-hidden rounded-lg border border-line bg-surface-2 focus-visible:outline-2 focus-visible:outline-ring"
              >
                {ohneVorschau.has(bild.id) ? (
                  <span className="grid size-full place-items-center text-ink-3">
                    <ImageOff className="size-5" aria-hidden />
                  </span>
                ) : (
                  // Plain <img>: signierte Supabase-URLs wechseln ständig, next/image bräuchte
                  // dafür eine remotePatterns-Konfiguration und würde sie nur neu cachen.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={bild.url} alt={bild.dateiname} className="size-full object-cover" onError={() => bildFehler(bild.id)} />
                )}
              </button>
              <span className="truncate text-[11px] text-ink-3" title={bild.dateiname}>
                {bild.dateiname}
              </span>
              {downloadLink(bild)}
              <AnhangKnoepfe anhang={bild} onFoto={() => setFotoFuer(bild)} onLoeschen={() => setLoeschenFuer(bild)} />
            </div>
          ))}
        </div>
      )}
      {pdfs.map((pdf) => (
        <div key={pdf.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-line px-3 py-2">
          <FileText className="size-4 flex-none text-ink-3" aria-hidden />
          <a
            href={pdf.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => void linkKlick(e, pdf.id, "ansehen")}
            className="min-w-0 flex-1 basis-40 truncate text-sm text-brand hover:underline"
          >
            {pdf.dateiname}
          </a>
          <span className="flex-none text-[11px] text-ink-3">{groesseText(pdf.groesse)}</span>
          {downloadLink(pdf)}
          <AnhangKnoepfe anhang={pdf} onFoto={() => setFotoFuer(pdf)} onLoeschen={() => setLoeschenFuer(pdf)} />
        </div>
      ))}
      {nichtGespeichert.length > 0 && (
        <p className="text-xs text-ink-3">Nicht übernommen (nur Name): {nichtGespeichert.join(", ")}</p>
      )}
      <ObjektfotoDialog anhang={fotoFuer} objekte={objekte} vorauswahl={objektId} onSchliessen={() => setFotoFuer(null)} />
      {/* Explizit neu laden: bei null verbleibenden Anhängen lädt useAnhangLinks nicht von selbst. */}
      <AnhangLoeschenDialog anhang={loeschenFuer} onSchliessen={() => setLoeschenFuer(null)} onGeloescht={() => void neuLaden()} />
      <Dialog open={gross !== null} onOpenChange={(offen) => !offen && setGrossId(null)}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle className="truncate">{gross?.dateiname}</DialogTitle>
            <DialogDescription>{gross ? groesseText(gross.groesse) : ""}</DialogDescription>
          </DialogHeader>
          {gross && (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element -- gleiche Begründung wie oben */}
              <img
                src={gross.url}
                alt={gross.dateiname}
                className="max-h-[70vh] w-full rounded-lg object-contain"
                onError={() => bildFehler(gross.id)}
              />
              {downloadLink(gross)}
            </>
          )}
        </DialogContent>
      </Dialog>
    </section>
  )
}
