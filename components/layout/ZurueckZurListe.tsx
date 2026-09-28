import { ArrowUp } from "lucide-react"

// Nur unter lg sichtbar, wo das Detail unter der Liste steht.
export function ZurueckZurListe({ onKlick }: { onKlick: () => void }) {
  return (
    <button
      type="button"
      onClick={onKlick}
      className="flex w-full items-center gap-1.5 border-b border-line px-4 py-2.5 text-left text-xs font-medium text-brand hover:bg-surface-2 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring lg:hidden"
    >
      <ArrowUp className="size-3.5" aria-hidden />
      Zurück zur Liste
    </button>
  )
}
