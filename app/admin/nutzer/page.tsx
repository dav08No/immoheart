import { notFound } from "next/navigation"
import { NutzerAnsicht } from "@/components/nutzer/NutzerAnsicht"
import { holeEigenesProfil } from "@/lib/queries/profile"
import { holeKonten } from "@/lib/queries/nutzer"

export default async function NutzerSeite() {
  const profil = await holeEigenesProfil()
  // 404 statt Hinweis: Konten ohne Recht sollen die Seite gar nicht als vorhanden erleben.
  if (!profil.darf_nutzer_anlegen) notFound()
  const konten = await holeKonten()

  // Seitenkopf und <main> rendert NutzerAnsicht selbst: die Hauptaktion "Neues Konto"
  // öffnet das Formular-Panel im selben Client-State.
  return <NutzerAnsicht konten={konten} eigeneUserId={profil.user_id} />
}
