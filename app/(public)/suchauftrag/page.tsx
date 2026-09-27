import type { Metadata } from "next"
import { connection } from "next/server"
import { erstelleZeitToken } from "@/lib/formular-schutz"
import { formularGeheimnis } from "@/lib/formular-geheimnis"
import { MailVariante } from "@/components/public/suchauftrag/MailVariante"
import { SuchauftragFormular } from "@/components/public/suchauftrag/SuchauftragFormular"

export const metadata: Metadata = {
  title: "Suchauftrag",
  description:
    "Sie suchen Büro-, Gewerbe-, Produktions- oder Lagerfläche in der Region Solothurn? Hinterlassen Sie einen Suchauftrag – wir melden uns mit passenden Objekten.",
}

// Fehlt das Geheimnis, soll die Seite trotzdem erscheinen; das Formular holt bei
// leerem Token beim Laden ein neues nach (zeitTokenHolen).
function neuesZeitToken(): string {
  try {
    return erstelleZeitToken(Date.now(), formularGeheimnis())
  } catch (fehler) {
    console.error("Suchauftrag: Zeit-Token fehlgeschlagen", fehler)
    return ""
  }
}

export default async function SuchauftragPage() {
  // Pro Aufruf rendern: das Zeit-Token muss vom Seitenaufruf stammen, nicht vom Build.
  await connection()

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-10 px-4 py-10">
      <header className="flex max-w-3xl flex-col gap-3">
        <h1 className="font-display text-3xl font-bold text-ink sm:text-4xl">Suchauftrag</h1>
        <p className="text-lg text-ink-2">
          Nicht das Passende dabei? Sagen Sie uns, was Sie suchen. Wir gleichen Ihren Wunsch mit unseren
          Flächen ab und melden uns persönlich, sobald etwas passt.
        </p>
      </header>
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
        <SuchauftragFormular zeitToken={neuesZeitToken()} />
        <MailVariante />
      </div>
    </div>
  )
}
