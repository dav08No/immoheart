import { Header } from "@/components/layout/Header"
import { PostfachAnsicht } from "@/components/postfach/PostfachAnsicht"
import { holeEntwuerfe, holeNachrichten } from "@/lib/queries/nachrichten"

export default async function PostfachPage() {
  // holeNachrichten() liefert seit N3 keine Entwürfe mehr (eigene Ansicht unter
  // /admin/entwuerfe) -- die Rückfrage-Zuordnung in PostfachAnsicht braucht sie
  // aber weiterhin, deshalb zusätzlich holeEntwuerfe() laden.
  const [nachrichten, entwuerfe] = await Promise.all([holeNachrichten(), holeEntwuerfe()])
  const rueckfragen = entwuerfe.map(({ id, antwort_auf, an, typ }) => ({ id, antwort_auf, an, typ }))

  return (
    <>
      <Header titel="Postfach" untertitel="Eingang und Gesendet" />
      <main className="flex-1 overflow-y-auto p-5">
        <PostfachAnsicht nachrichten={nachrichten} rueckfragen={rueckfragen} />
      </main>
    </>
  )
}
