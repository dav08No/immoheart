import { redirect } from "next/navigation"
import { erstelleServerClient } from "@/lib/supabase/server"
import { AnmeldeRahmen } from "@/components/auth/AnmeldeRahmen"
import { PasswortSetzenFormular } from "@/components/auth/PasswortSetzenFormular"
import { LOGIN_PFAD } from "@/lib/routen"

export default async function PasswortSetzenSeite() {
  const supabase = await erstelleServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect(`${LOGIN_PFAD}?grund=link-ungueltig`)

  return (
    <AnmeldeRahmen titel="Passwort festlegen">
      <PasswortSetzenFormular email={user.email ?? ""} />
    </AnmeldeRahmen>
  )
}
