import { Header } from "@/components/layout/Header"
import { ObjekteAnsicht, type ObjektVorbelegung } from "@/components/objekte/ObjekteAnsicht"
import { holeObjekte, zaehleNeueMatchesFuerObjekt } from "@/lib/queries/objekte"
import { holeNachricht } from "@/lib/queries/nachrichten"
import { objektVorbelegung } from "@/lib/objekt-vorbelegung"
import { idSchema } from "@/app/actions/entwuerfe-hilfen"

// ?aus=<Eingangs-id> aus dem Postfach-Link "Als Objekt übernehmen" (Task 7): nur eine
// gültige uuid wird überhaupt nachgeschlagen, alles andere (falsche Kategorie, gelöscht,
// nicht gefunden) ignoriert objektVorbelegung selbst still -- kein Fehler, das Formular
// öffnet dann einfach leer wie ein normales "Objekt anlegen".
async function ladeVorbelegung(aus: string | undefined): Promise<ObjektVorbelegung | null> {
  const geprueft = aus ? idSchema.safeParse(aus) : null
  if (!geprueft?.success) return null
  const eingang = await holeNachricht(geprueft.data)
  const werte = objektVorbelegung(eingang)
  return werte ? { nachrichtId: geprueft.data, werte } : null
}

export default async function ObjektePage({ searchParams }: { searchParams: Promise<{ aus?: string }> }) {
  const [objekte, { aus }] = await Promise.all([holeObjekte(), searchParams])
  const vorbelegung = await ladeVorbelegung(aus)
  // zaehleNeueMatchesFuerObjekt (nicht das ungefilterte zaehleMatchesFuerObjekt)
  // -- ObjektRaster erwartet laut eigenem JSDoc-Kommentar eine status='neu'-
  // gefilterte Zählung fuer sein "N neue Treffer"-Badge, siehe dortiger Kommentar.
  const trefferPaare = await Promise.all(
    objekte.map(async (o) => [o.id, await zaehleNeueMatchesFuerObjekt(o.id)] as const),
  )
  const treffer = Object.fromEntries(trefferPaare)

  return (
    <>
      <Header titel="Objekte" untertitel={`${objekte.length} im Bestand`} />
      <main className="flex-1 overflow-y-auto p-5">
        <ObjekteAnsicht objekte={objekte} treffer={treffer} vorbelegung={vorbelegung} />
      </main>
    </>
  )
}
