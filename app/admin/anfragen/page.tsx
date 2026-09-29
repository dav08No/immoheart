import { SEITEN_INHALT_KLASSE } from "@/components/layout/Seitenkopf"
import { AnfragenKopf } from "@/components/anfragen/AnfragenKopf"
import { AnfragenAnsicht } from "@/components/anfragen/AnfragenAnsicht"
import { holeAnfragen } from "@/lib/queries/anfragen"

export default async function AnfragenPage({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const [anfragen, { id }] = await Promise.all([holeAnfragen(), searchParams])
  // ?id= kommt aus dem Postfach-Link "zugeordnete Anfrage"; unbekannte IDs still ignorieren.
  const startId = id && anfragen.some((a) => a.id === id) ? id : null
  const offen = anfragen.filter((a) => a.status === "offen").length
  const vermittelt = anfragen.filter((a) => a.status === "vermittelt").length

  return (
    <>
      <AnfragenKopf offen={offen} vermittelt={vermittelt} />
      <main className={SEITEN_INHALT_KLASSE}>
        <AnfragenAnsicht anfragen={anfragen} startId={startId} />
      </main>
    </>
  )
}
