import { notFound } from "next/navigation"
import { Header } from "@/components/layout/Header"
import { NutzerListe } from "@/components/nutzer/NutzerListe"
import { NeuesKontoFormular } from "@/components/nutzer/NeuesKontoFormular"
import { holeEigenesProfil } from "@/lib/queries/profile"
import { holeKonten } from "@/lib/queries/nutzer"

export default async function NutzerSeite() {
  const profil = await holeEigenesProfil()
  // 404 statt Hinweis: Konten ohne Recht sollen die Seite gar nicht als vorhanden erleben.
  if (!profil.darf_nutzer_anlegen) notFound()
  const konten = await holeKonten()

  return (
    <>
      <Header titel="Nutzer" untertitel={`${konten.length} Konten`} />
      <main className="flex flex-1 flex-col gap-4 overflow-y-auto p-5 lg:flex-row lg:items-start">
        <NutzerListe konten={konten} eigeneUserId={profil.user_id} />
        <NeuesKontoFormular />
      </main>
    </>
  )
}
