"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import { ImagePlus } from "lucide-react"
import { FotoKachel } from "./FotoKachel"
import { Abschnittstitel } from "@/components/ui/Abschnittstitel"
import { Leerzustand } from "@/components/ui/Leerzustand"
import { useFotoUpload } from "./useFotoUpload"
import { fotoLoeschen, fotosLaden, fotosSortieren } from "@/app/actions/fotos"
import { FOTO_MIME_TYPEN, verschiebe } from "@/lib/objekt-fotos"
import type { Foto } from "@/lib/queries/fotos"

// Fotos werden sofort gespeichert (nicht erst mit "Änderungen speichern") -- sie liegen
// in einer eigenen Tabelle und brauchen die Objekt-id, die es erst nach dem Anlegen gibt.
export function ObjektFotos({ objektId }: { objektId: string }) {
  const [fotos, setFotos] = useState<Foto[] | null>(null)
  const [beschaeftigt, setBeschaeftigt] = useState(false)
  const [gezogen, setGezogen] = useState<number | null>(null)
  const [ladefehler, setLadefehler] = useState<string | null>(null)
  const sperre = useRef(false)
  const dateiEingabe = useRef<HTMLInputElement>(null)

  const neuLaden = useCallback(async () => {
    try {
      const { fehler, fotos: geladen } = await fotosLaden(objektId)
      if (fehler) {
        setLadefehler(fehler)
      } else {
        setFotos(geladen)
        setLadefehler(null)
      }
    } catch {
      setLadefehler("Fotos konnten nicht geladen werden.")
    }
  }, [objektId])

  useEffect(() => {
    void neuLaden()
  }, [neuLaden])

  const { hochladen, fortschritt } = useFotoUpload(objektId, neuLaden)
  const gesperrt = beschaeftigt || fortschritt !== null || fotos === null

  // Eine Änderung zur Zeit; bei Fehler den Serverstand neu laden statt zu raten.
  async function ausfuehren(aktion: () => Promise<{ fehler: string | null }>, erfolg?: string) {
    if (sperre.current) return
    sperre.current = true
    setBeschaeftigt(true)
    try {
      const { fehler } = await aktion()
      if (fehler) toast.error(fehler)
      else if (erfolg) toast.success(erfolg)
      if (fehler) await neuLaden()
    } catch {
      toast.error("Unerwarteter Fehler. Bitte Seite neu laden.")
      await neuLaden()
    } finally {
      sperre.current = false
      setBeschaeftigt(false)
    }
  }

  function verschieben(von: number, nach: number) {
    if (!fotos || gesperrt) return
    const neu = verschiebe(fotos, von, nach)
    if (neu.every((f, i) => f.id === fotos[i]?.id)) return
    setFotos(neu)
    void ausfuehren(() => fotosSortieren(objektId, neu.map((f) => f.id)))
  }

  function loeschen(id: string) {
    void ausfuehren(async () => {
      const ergebnis = await fotoLoeschen(id)
      if (!ergebnis.fehler) setFotos((alt) => alt?.filter((f) => f.id !== id) ?? alt)
      return ergebnis
    }, "Foto gelöscht")
  }

  function dateienGewaehlt(liste: FileList | null) {
    const dateien = liste ? Array.from(liste) : []
    // Zurücksetzen, damit dieselbe Datei nach einem Fehler erneut gewählt werden kann.
    if (dateiEingabe.current) dateiEingabe.current.value = ""
    void hochladen(dateien)
  }

  return (
    <section className="flex flex-col gap-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Abschnittstitel>Fotos</Abschnittstitel>
        <label
          className={`inline-flex min-h-8 items-center gap-1.5 rounded-lg border border-eingabe-rand bg-surface px-3 py-1 text-sm font-medium text-ink transition-colors motion-reduce:transition-none ${gesperrt ? "pointer-events-none opacity-60" : "cursor-pointer hover:bg-surface-2"} focus-within:ring-2 focus-within:ring-ring`}
        >
          <ImagePlus className="size-4" aria-hidden />
          Fotos hinzufügen
          <input
            ref={dateiEingabe}
            type="file"
            multiple
            accept={FOTO_MIME_TYPEN.join(",")}
            disabled={gesperrt}
            onChange={(e) => dateienGewaehlt(e.target.files)}
            className="sr-only"
          />
        </label>
      </div>
      <p className="text-xs text-ink-2">
        JPG, PNG oder WebP, höchstens 5 MB. Das erste Foto ist das Titelbild; ziehen oder mit den Pfeilen umordnen.
        Änderungen an Fotos werden sofort gespeichert.
      </p>
      {fortschritt && (
        <p className="text-xs text-ink-2" role="status">
          {fortschritt.fertig}/{fortschritt.gesamt} hochgeladen
        </p>
      )}
      {ladefehler && (
        <p className="flex flex-wrap items-center gap-2 text-xs text-crit" role="alert">
          {ladefehler}
          <button type="button" onClick={() => void neuLaden()} className="rounded text-brand underline outline-none focus-visible:ring-2 focus-visible:ring-ring">
            Erneut laden
          </button>
        </p>
      )}
      {fotos === null ? (
        !ladefehler && <p className="text-xs text-ink-2">Fotos werden geladen…</p>
      ) : fotos.length === 0 ? (
        <Leerzustand klein text="Noch keine Fotos." />
      ) : (
        <ul className="grid grid-cols-2 gap-2">
          {fotos.map((foto, index) => (
            <FotoKachel
              key={foto.id}
              foto={foto}
              index={index}
              anzahl={fotos.length}
              gesperrt={gesperrt}
              gezogen={gezogen === index}
              onVerschieben={verschieben}
              onLoeschen={loeschen}
              onZiehStart={setGezogen}
              onZiehEnde={() => setGezogen(null)}
              onAblegen={(nach) => {
                if (gezogen !== null) verschieben(gezogen, nach)
                setGezogen(null)
              }}
            />
          ))}
        </ul>
      )}
    </section>
  )
}
