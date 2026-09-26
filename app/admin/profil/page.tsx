import { Header } from "@/components/layout/Header"
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
      <Header titel="Profil" />
      <main className="flex-1 overflow-y-auto p-5">
        <ProfilFormular name={profil.name} email={user?.email ?? ""} />
      </main>
    </>
  )
}
