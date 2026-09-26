import { Header } from "@/components/layout/Header"
import { AnfragenAnsicht } from "@/components/anfragen/AnfragenAnsicht"
import { holeAnfragen } from "@/lib/queries/anfragen"

export default async function AnfragenPage() {
  const anfragen = await holeAnfragen()

  return (
    <>
      <Header titel="Anfragen" untertitel={`${anfragen.length} offen`} />
      <main className="flex-1 overflow-y-auto p-5">
        <AnfragenAnsicht anfragen={anfragen} />
      </main>
    </>
  )
}
