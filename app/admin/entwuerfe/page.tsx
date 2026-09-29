import { SEITEN_INHALT_KLASSE } from "@/components/layout/Seitenkopf"
import { EntwuerfeKopf } from "@/components/entwuerfe/EntwuerfeKopf"
import { EntwuerfeAnsicht } from "@/components/entwuerfe/EntwuerfeAnsicht"
import { holeEntwuerfe } from "@/lib/queries/nachrichten"

export default async function EntwuerfePage({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const [entwuerfe, { id }] = await Promise.all([holeEntwuerfe(), searchParams])
  // id nur übernehmen, wenn sie tatsächlich in der (nicht gelöschten) Liste
  // vorkommt -- ein veralteter oder manipulierter Query-Parameter wird sonst
  // stillschweigend ignoriert, statt einen Fehler zu zeigen.
  const startId = id && entwuerfe.some((entwurf) => entwurf.id === id) ? id : null

  return (
    <>
      <EntwuerfeKopf offen={entwuerfe.length} />
      <main className={SEITEN_INHALT_KLASSE}>
        <EntwuerfeAnsicht entwuerfe={entwuerfe} startId={startId} />
      </main>
    </>
  )
}
