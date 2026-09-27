import { Header } from "@/components/layout/Header"
import { AnfragenAnsicht } from "@/components/anfragen/AnfragenAnsicht"
import { holeAnfragen } from "@/lib/queries/anfragen"

export default async function AnfragenPage({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const [anfragen, { id }] = await Promise.all([holeAnfragen(), searchParams])
  // ?id= kommt aus dem Postfach-Link "zugeordnete Anfrage"; unbekannte IDs still ignorieren.
  const startId = id && anfragen.some((a) => a.id === id) ? id : null

  return (
    <>
      <Header titel="Anfragen" untertitel={`${anfragen.length} offen`} />
      <main className="flex-1 overflow-y-auto p-5">
        <AnfragenAnsicht anfragen={anfragen} startId={startId} />
      </main>
    </>
  )
}
