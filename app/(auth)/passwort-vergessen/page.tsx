import { AnmeldeRahmen } from "@/components/auth/AnmeldeRahmen"
import { PasswortVergessenFormular } from "@/components/auth/PasswortVergessenFormular"

export default function PasswortVergessenSeite() {
  return (
    <AnmeldeRahmen titel="Passwort vergessen">
      <PasswortVergessenFormular />
    </AnmeldeRahmen>
  )
}
