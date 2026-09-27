"use client"

import { useRef, useState } from "react"
import { toast } from "sonner"
import { erstelleBrowserClient } from "@/lib/supabase/client"
import { FOTO_BUCKET, pruefeFoto } from "@/lib/objekt-fotos"
import { fotoRegistrieren, uploadVorbereiten } from "@/app/actions/fotos"

export type UploadFortschritt = { fertig: number; gesamt: number }

// Eine Datei nach der anderen: so bleibt die Reihenfolge der Auswahl erhalten und ein
// Fehler betrifft nur die eine Datei (eigener Toast), die übrigen laufen weiter.
async function ladeHoch(objektId: string, datei: File): Promise<string | null> {
  const vorab = pruefeFoto(datei.type, datei.size)
  if (vorab) return vorab
  const { fehler, ziel } = await uploadVorbereiten(objektId, datei.type, datei.size)
  if (fehler || !ziel) return fehler ?? "Upload konnte nicht vorbereitet werden."
  const { error } = await erstelleBrowserClient()
    .storage.from(FOTO_BUCKET)
    .uploadToSignedUrl(ziel.pfad, ziel.token, datei, { contentType: datei.type })
  if (error) return "Hochladen fehlgeschlagen."
  const registriert = await fotoRegistrieren(objektId, ziel.pfad)
  return registriert.fehler
}

export function useFotoUpload(objektId: string, nachUpload: () => Promise<void>) {
  const [fortschritt, setFortschritt] = useState<UploadFortschritt | null>(null)
  const sperre = useRef(false)

  async function hochladen(dateien: File[]) {
    if (sperre.current || dateien.length === 0) return
    sperre.current = true
    setFortschritt({ fertig: 0, gesamt: dateien.length })
    let erfolgreich = 0
    try {
      for (const [index, datei] of dateien.entries()) {
        try {
          const fehler = await ladeHoch(objektId, datei)
          if (fehler) toast.error(`${datei.name}: ${fehler}`)
          else erfolgreich += 1
        } catch {
          toast.error(`${datei.name}: Unerwarteter Fehler.`)
        }
        setFortschritt({ fertig: index + 1, gesamt: dateien.length })
      }
      if (erfolgreich > 0) toast.success(erfolgreich === 1 ? "Foto hinzugefügt" : `${erfolgreich} Fotos hinzugefügt`)
      await nachUpload()
    } finally {
      sperre.current = false
      setFortschritt(null)
    }
  }

  return { hochladen, fortschritt }
}
