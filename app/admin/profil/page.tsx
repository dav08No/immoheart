import { Seitenkopf, SEITEN_INHALT_KLASSE } from "@/components/layout/Seitenkopf"
import { ProfilFormular } from "@/components/profil/ProfilFormular"
import { holeEigenesProfil } from "@/lib/queries/profile"
import { erstelleServerClient } from "@/lib/supabase/server"

export default async function ProfilSeite() {
  const profil = await holeEigenesProfil()
  const supabase = await erstelleServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <>
      <Seitenkopf titel="Profil" />
      <main className={SEITEN_INHALT_KLASSE}>
        <ProfilFormular name={profil.name} email={user?.email ?? ""} />
      </main>
    </>
  )
}
