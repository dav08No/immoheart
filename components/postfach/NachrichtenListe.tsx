import { NachrichtZeile } from "./NachrichtZeile"
import { Leerzustand } from "@/components/ui/Leerzustand"
import type { PostfachNachricht } from "@/lib/queries/postfach"

type Props = {
  nachrichten: PostfachNachricht[]
  ausgewaehlteId: string | null
  onAuswahl: (id: string) => void
}

export function NachrichtenListe({ nachrichten, ausgewaehlteId, onAuswahl }: Props) {
  if (nachrichten.length === 0) return <Leerzustand text="Nichts hier." klein />
  return (
    <ul aria-label="Nachrichten" className="flex flex-col gap-0.5 p-1.5">
      {nachrichten.map((nachricht) => (
        <li key={nachricht.id}>
          <NachrichtZeile
            nachricht={nachricht}
            ausgewaehlt={nachricht.id === ausgewaehlteId}
            onAuswahl={() => onAuswahl(nachricht.id)}
          />
        </li>
      ))}
    </ul>
  )
}
