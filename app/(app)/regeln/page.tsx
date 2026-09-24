import { Header } from "@/components/layout/Header"
import { RegelnListe } from "@/components/regeln/RegelnListe"
import { holeRegeln } from "@/lib/queries/regeln"

export default async function RegelnPage() {
  const regeln = await holeRegeln()

  return (
    <>
      <Header titel="Regeln" untertitel="gelernt aus Entscheiden" />
      <main className="flex-1 overflow-y-auto p-5">
        <RegelnListe regeln={regeln} />
      </main>
    </>
  )
}
