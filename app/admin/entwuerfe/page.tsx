import { Header } from "@/components/layout/Header"
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
      <Header titel="Entwürfe" untertitel={`${entwuerfe.length} offen`} />
      <main className="flex-1 overflow-y-auto p-5">
        <EntwuerfeAnsicht entwuerfe={entwuerfe} startId={startId} />
      </main>
    </>
  )
}
