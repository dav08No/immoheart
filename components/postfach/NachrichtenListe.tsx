import { NachrichtZeile } from "./NachrichtZeile"
import type { PostfachNachricht } from "@/lib/queries/postfach"

type Props = {
  nachrichten: PostfachNachricht[]
  ausgewaehlteId: string | null
  onAuswahl: (id: string) => void
}

export function NachrichtenListe({ nachrichten, ausgewaehlteId, onAuswahl }: Props) {
  if (nachrichten.length === 0) return <p className="p-6 text-center text-sm text-ink-3">Nichts hier.</p>
  return (
    <ul aria-label="Nachrichten">
      {nachrichten.map((nachricht) => (
        <li key={nachricht.id} className="border-b border-line last:border-b-0">
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
