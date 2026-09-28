import { AlertTriangle, ArrowDownLeft, Check, Clock, Globe, Loader2, Paperclip } from "lucide-react"
import { ListenZeile } from "@/components/ui/ListenZeile"
import { StatusChip } from "@/components/ui/StatusChip"
import { anhangBadges, chipVon, istUngelesen, kiAnzeige, KATEGORIE_CHIPS } from "@/lib/postfach"
import { formatUhrzeit, formatZeitpunkt } from "@/lib/format"
import type { PostfachNachricht } from "@/lib/queries/postfach"

const SYMBOL = "size-3.5 flex-none self-center"
const KACHEL = "grid size-[26px] flex-none place-items-center rounded-lg"

// text-ink-2 statt ink-3 für "wartet": ein Statussymbol braucht >= 3:1.
function KiSymbol({ status }: { status: string | null }) {
  const anzeige = kiAnzeige(status)
  if (anzeige === "laeuft") {
    return <Loader2 className={`${SYMBOL} animate-spin text-brand`} aria-label="wird eingeordnet" />
  }
  if (anzeige === "wartet") return <Clock className={`${SYMBOL} text-ink-2`} aria-label="wartet auf Einordnung" />
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
  const chip = chipVon(nachricht.kategorie)
  const kategorie = KATEGORIE_CHIPS.find((k) => k.wert === chip)?.label
  const zeit = nachricht.empfangen_am ?? nachricht.gesendet_am ?? nachricht.created_at
  const person = nachricht.richtung === "gesendet" ? `An ${nachricht.an}` : nachricht.von
  const anhaenge = anhangBadges(nachricht.anhangTypen)
  // Leere Badge-Zeile vermeiden: ListenZeile rendert sonst einen leeren Abstand.
  const hatBadges = kategorie !== undefined || anhaenge.length > 0 || kiAnzeige(nachricht.ki_status) !== null

  return (
    <ListenZeile
      titel={nachricht.betreff || "(ohne Betreff)"}
      unterzeile={person}
      zeit={kurzzeit(zeit)}
      icon={<Richtungssymbol nachricht={nachricht} />}
      ungelesen={istUngelesen(nachricht)}
      ausgewaehlt={ausgewaehlt}
      onClick={onAuswahl}
      badges={
        hatBadges ? (
          <>
            <KiSymbol status={nachricht.ki_status} />
            {kategorie && <StatusChip>{kategorie}</StatusChip>}
            {anhaenge.map((text) => (
              <StatusChip key={text} icon={<Paperclip aria-hidden />}>
                {text}
              </StatusChip>
            ))}
          </>
        ) : undefined
      }
    />
  )
}
