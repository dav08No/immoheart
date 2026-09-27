"use client"

import { useRouter } from "next/navigation"
import { FilePen, Reply } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/shadcn/badge"
import { antwortEntwerfen } from "@/app/actions/postfach"
import { aktionsBlock, nichtGespeicherteAnhaenge } from "@/lib/postfach"
import { formatUhrzeit, formatZeitpunkt } from "@/lib/format"
import type { PostfachNachricht } from "@/lib/queries/postfach"
import { AnhangGalerie } from "./AnhangGalerie"
import { KiBereich } from "./KiBereich"
import { AktionenSuchanfrage } from "./AktionenSuchanfrage"
import { AktionenAntwort } from "./AktionenAntwort"
import { AktionenObjektangebot } from "./AktionenObjektangebot"
import { useAktion } from "./useAktion"
import type { AnfrageOption, EntwurfVerweis } from "./typen"

type Props = {
  nachricht: PostfachNachricht
  entwuerfe: EntwurfVerweis[]
  anfragen: AnfrageOption[]
  onRueckfrageOeffnen: () => void
}

// Wird mit key={nachricht.id} gerendert: ein Wechsel mountet neu, lokaler State
// (laufende Aktion, Auswahlfelder, Anhang-Links) muss nicht zurückgesetzt werden.
export function EingangDetail({ nachricht, entwuerfe, anfragen, onRueckfrageOeffnen }: Props) {
  const router = useRouter()
  const { laufend, ausfuehren } = useAktion()
  const block = aktionsBlock(nachricht)
  // Jüngster offener Entwurf zu diesem Eingang (holeEntwuerfe sortiert absteigend).
  const antwortEntwurf = entwuerfe.find((e) => e.antwort_auf === nachricht.id)
  const empfangen = nachricht.empfangen_am ?? nachricht.created_at

  async function entwerfen() {
    const neu: { id: string | null } = { id: null }
    const ok = await ausfuehren("entwerfen", async () => {
      const ergebnis = await antwortEntwerfen(nachricht.id)
      neu.id = ergebnis.entwurfId
      return ergebnis
    })
    if (ok && neu.id) router.push(`/admin/entwuerfe?id=${neu.id}`)
  }

  return (
    <article aria-label={nachricht.betreff}>
      <header className="border-b border-line p-4">
        <div className="flex items-start gap-2">
          <h2 className="min-w-0 flex-1 font-display text-base font-bold text-ink">{nachricht.betreff || "(ohne Betreff)"}</h2>
          {nachricht.quelle === "website" && <Badge variant="outline">Website</Badge>}
        </div>
        <div className="mt-0.5 text-xs text-ink-3">
          Von{" "}
          <a href={`mailto:${nachricht.von}`} className="text-brand hover:underline">
            {nachricht.von}
          </a>
          {` · empfangen am ${formatZeitpunkt(new Date(empfangen))} ${formatUhrzeit(new Date(empfangen))}`}
        </div>
      </header>
      <div className="p-4">
        {/* Nur Text, nie HTML: der Abruf speichert bereits reinen Text. */}
        <div className="whitespace-pre-wrap rounded-lg border border-line bg-surface-2 p-3 text-sm text-ink-2">
          {nachricht.body}
        </div>
        <AnhangGalerie
          nachrichtId={nachricht.id}
          anzahl={nachricht.anhangTypen.length}
          nichtGespeichert={nichtGespeicherteAnhaenge(nachricht.anhaenge)}
        />
        <KiBereich nachricht={nachricht} laufend={laufend} ausfuehren={ausfuehren} />
        {block === "suchanfrage" && (
          <AktionenSuchanfrage
            nachricht={nachricht}
            laufend={laufend}
            ausfuehren={ausfuehren}
            onRueckfrageOeffnen={onRueckfrageOeffnen}
          />
        )}
        {block === "antwort" && (
          <AktionenAntwort nachricht={nachricht} anfragen={anfragen} laufend={laufend} ausfuehren={ausfuehren} />
        )}
        {block === "objektangebot" && <AktionenObjektangebot nachricht={nachricht} />}
        <div className="mt-4 flex flex-wrap gap-2 border-t border-line pt-3.5">
          {(block === "antwort" || block === "objektangebot") && antwortEntwurf && (
            <Button onClick={() => router.push(`/admin/entwuerfe?id=${antwortEntwurf.id}`)}>
              <FilePen className="size-4" aria-hidden />
              Antwort-Entwurf öffnen
            </Button>
          )}
          <Button disabled={laufend !== null} onClick={() => void entwerfen()}>
            <Reply className="size-4" aria-hidden />
            {laufend === "entwerfen" ? "Wird angelegt…" : "Antwort entwerfen"}
          </Button>
        </div>
      </div>
    </article>
  )
}
