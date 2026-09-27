import { AlertTriangle, ArrowDownLeft, Check, Clock, Globe, Loader2 } from "lucide-react"
import { Badge } from "@/components/shadcn/badge"
import { anhangBadges, chipVon, istUngelesen, kiAnzeige, KATEGORIE_CHIPS } from "@/lib/postfach"
import { formatUhrzeit, formatZeitpunkt } from "@/lib/format"
import type { PostfachNachricht } from "@/lib/queries/postfach"

const SYMBOL = "size-3.5 flex-none"
const ZEILE =
  "flex w-full gap-2.5 p-3 text-left hover:bg-surface-2 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
const KACHEL = "grid size-[26px] flex-none place-items-center rounded-lg"

function KiSymbol({ status }: { status: string | null }) {
  const anzeige = kiAnzeige(status)
  if (anzeige === "laeuft") {
    return <Loader2 className={`${SYMBOL} animate-spin text-brand`} aria-label="wird eingeordnet" />
  }
  if (anzeige === "wartet") return <Clock className={`${SYMBOL} text-ink-3`} aria-label="wartet auf Einordnung" />
  if (anzeige === "fehler") {
    return <AlertTriangle className={`${SYMBOL} text-crit`} aria-label="Einordnung fehlgeschlagen" />
  }
  return null
}

function Richtungssymbol({ nachricht }: { nachricht: PostfachNachricht }) {
  if (nachricht.richtung === "gesendet") {
    return (
      <span className={`${KACHEL} bg-good-bg text-good`}>
        <Check className="size-3.5" aria-label="gesendet" />
      </span>
    )
  }
  const website = nachricht.quelle === "website"
  const Symbol = website ? Globe : ArrowDownLeft
  return (
    <span className={`${KACHEL} bg-surface-3 text-ink-2`}>
      <Symbol className="size-3.5" aria-label={website ? "über die Website" : "Eingang"} />
    </span>
  )
}

function kurzzeit(iso: string): string {
  const datum = new Date(iso)
  return formatZeitpunkt(datum) === formatZeitpunkt(new Date()) ? formatUhrzeit(datum) : formatZeitpunkt(datum).slice(0, 6)
}

type Props = { nachricht: PostfachNachricht; ausgewaehlt: boolean; onAuswahl: () => void }

export function NachrichtZeile({ nachricht, ausgewaehlt, onAuswahl }: Props) {
  const ungelesen = istUngelesen(nachricht)
  const chip = chipVon(nachricht.kategorie)
  const kategorie = KATEGORIE_CHIPS.find((k) => k.wert === chip)?.label
  const zeit = nachricht.empfangen_am ?? nachricht.gesendet_am ?? nachricht.created_at
  const person = nachricht.richtung === "gesendet" ? `An ${nachricht.an}` : nachricht.von

  return (
    <button
      type="button"
      onClick={onAuswahl}
      aria-current={ausgewaehlt ? "true" : undefined}
      className={`${ZEILE} ${ausgewaehlt ? "bg-brand-soft" : ""}`}
    >
      <Richtungssymbol nachricht={nachricht} />
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="flex items-center gap-1.5">
          {ungelesen && (
            <span className="size-2 flex-none rounded-full bg-brand" aria-hidden />
          )}
          <span className={`truncate text-sm text-ink ${ungelesen ? "font-bold" : "font-medium"}`}>
            {ungelesen && <span className="sr-only">Ungelesen: </span>}
            {nachricht.betreff || "(ohne Betreff)"}
          </span>
          <span className="ml-auto flex-none text-[11px] tabular-nums text-ink-3">{kurzzeit(zeit)}</span>
        </span>
        <span className="truncate text-xs text-ink-3">{person}</span>
        <span className="flex flex-wrap items-center gap-1">
          <KiSymbol status={nachricht.ki_status} />
          {kategorie && <span className="text-[11px] text-ink-3">{kategorie}</span>}
          {anhangBadges(nachricht.anhangTypen).map((text) => (
            <Badge key={text} variant="outline" className="px-1.5 py-0 text-[10px] text-ink-2">
              {text}
            </Badge>
          ))}
        </span>
      </span>
    </button>
  )
}
