import { Header } from "@/components/layout/Header"
import { PostfachAnsicht } from "@/components/postfach/PostfachAnsicht"
import { holeNachrichten } from "@/lib/queries/nachrichten"

export default async function PostfachPage() {
  const nachrichten = await holeNachrichten()

  return (
    <>
      <Header titel="Postfach" untertitel="Eingang und Entwürfe" />
      <main className="flex-1 overflow-y-auto p-5">
        <PostfachAnsicht nachrichten={nachrichten} />
      </main>
    </>
  )
}
