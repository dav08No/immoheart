"use client"

import { useRouter } from "next/navigation"
import { FilePen, Reply } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { StatusChip } from "@/components/ui/StatusChip"
import { Abschnittstitel } from "@/components/ui/Abschnittstitel"
import { antwortEntwerfen } from "@/app/actions/postfach"
import { aktionsBlock, chipVon, KATEGORIE_CHIPS, nichtGespeicherteAnhaenge } from "@/lib/postfach"
import { formatUhrzeit, formatZeitpunkt } from "@/lib/format"
import type { PostfachNachricht } from "@/lib/queries/postfach"
import { AnhangGalerie } from "./AnhangGalerie"
import { KiBereich } from "./KiBereich"
import { AktionenSuchanfrage } from "./AktionenSuchanfrage"
import { AktionenAntwort } from "./AktionenAntwort"
import { AktionenObjektangebot } from "./AktionenObjektangebot"
import { AktionenObjektanfrage } from "./AktionenObjektanfrage"
import { AktionenObjektmeldung } from "./AktionenObjektmeldung"
import { useAktion } from "./useAktion"
import type { AnfrageOption, EntwurfVerweis, ObjektOption } from "./typen"

type Props = {
  nachricht: PostfachNachricht
  entwuerfe: EntwurfVerweis[]
  anfragen: AnfrageOption[]
  objekte: ObjektOption[]
  angeboteneTreffer: string[]
  onRueckfrageOeffnen: () => void
}

// Wird mit key={nachricht.id} gerendert: ein Wechsel mountet neu, lokaler State
// (laufende Aktion, Auswahlfelder, Anhang-Links) muss nicht zurückgesetzt werden.
export function EingangDetail({ nachricht, entwuerfe, anfragen, objekte, angeboteneTreffer, onRueckfrageOeffnen }: Props) {
  const router = useRouter()
  const { laufend, ausfuehren } = useAktion()
  const block = aktionsBlock(nachricht)
  // Jüngster offener Entwurf zu diesem Eingang (holeEntwuerfe sortiert absteigend).
  const antwortEntwurf = entwuerfe.find((e) => e.antwort_auf === nachricht.id)
  const empfangen = nachricht.empfangen_am ?? nachricht.created_at
  const kategorie = KATEGORIE_CHIPS.find((k) => k.wert === chipVon(nachricht.kategorie))?.label

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
      <header className="flex flex-col gap-1.5 border-b border-line p-4 sm:px-5">
        <h2 className="wrap-break-word font-display text-lg font-semibold text-ink">{nachricht.betreff || "(ohne Betreff)"}</h2>
        <div className="text-xs text-ink-2">
          Von{" "}
          <a href={`mailto:${nachricht.von}`} className="break-all text-brand hover:underline">
            {nachricht.von}
          </a>
          {` · empfangen am ${formatZeitpunkt(new Date(empfangen))} ${formatUhrzeit(new Date(empfangen))}`}
        </div>
        {(nachricht.quelle === "website" || kategorie) && (
          <div className="flex flex-wrap gap-1.5">
            {nachricht.quelle === "website" && <StatusChip ton="info">Website</StatusChip>}
            {kategorie && <StatusChip>{kategorie}</StatusChip>}
          </div>
        )}
      </header>
      {/* Abschnitte statt loser Blöcke: Nachricht, Anhänge, KI-Einordnung, Aktionen. */}
      <div className="flex flex-col gap-6 p-4 sm:p-5">
        <section aria-label="Nachricht" className="flex flex-col gap-2">
          <Abschnittstitel>Nachricht</Abschnittstitel>
          {/* Nur Text, nie HTML: der Abruf speichert bereits reinen Text. */}
          <div className="whitespace-pre-wrap wrap-break-word rounded-lg border border-line bg-surface-2 p-3 text-sm text-ink">
            {nachricht.body}
          </div>
        </section>
        <AnhangGalerie
          nachrichtId={nachricht.id}
          anzahl={nachricht.anhangTypen.length}
          nichtGespeichert={nichtGespeicherteAnhaenge(nachricht.anhaenge)}
          objekte={objekte}
          objektId={nachricht.objekt_id}
        />
        {/* Website-Einträge sind schon strukturiert; eine Umkategorisierung würde sie überschreiben. */}
        {nachricht.quelle !== "website" && (
          <KiBereich nachricht={nachricht} laufend={laufend} ausfuehren={ausfuehren} />
        )}
        {block === "suchanfrage" && (
          <AktionenSuchanfrage
            nachricht={nachricht}
            laufend={laufend}
            ausfuehren={ausfuehren}
            onRueckfrageOeffnen={onRueckfrageOeffnen}
          />
        )}
        {block === "antwort" && (
          <AktionenAntwort
            nachricht={nachricht}
            anfragen={anfragen}
            angeboteneTreffer={angeboteneTreffer}
            laufend={laufend}
            ausfuehren={ausfuehren}
          />
        )}
        {block === "objektangebot" && <AktionenObjektangebot nachricht={nachricht} />}
        {block === "objektmeldung" && (
          <AktionenObjektmeldung nachricht={nachricht} objekte={objekte} laufend={laufend} ausfuehren={ausfuehren} />
        )}
        {block === "objektanfrage" && (
          <AktionenObjektanfrage
            nachricht={nachricht}
            objekte={objekte}
            entwurf={antwortEntwurf}
            laufend={laufend}
            ausfuehren={ausfuehren}
          />
        )}
        {/* Die Objektanfrage zeigt "Entwurf öffnen" schon im eigenen Block. */}
        {!(block === "objektanfrage" && antwortEntwurf) && (
          <section aria-label="Antworten" className="flex flex-col gap-2 border-t border-line pt-4">
            <Abschnittstitel>Antworten</Abschnittstitel>
            <div className="flex flex-wrap gap-2">
              {/* Gibt es schon einen offenen Entwurf (KI oder früher angelegt), wird dieser
                  geöffnet statt ein zweiter angelegt -- sonst stapeln sich Antworten. */}
              {antwortEntwurf ? (
                <Button onClick={() => router.push(`/admin/entwuerfe?id=${antwortEntwurf.id}`)}>
                  <FilePen className="size-4" aria-hidden />
                  Entwurf öffnen
                </Button>
              ) : (
                <Button disabled={laufend !== null} onClick={() => void entwerfen()}>
                  <Reply className="size-4" aria-hidden />
                  {laufend === "entwerfen" ? "Wird angelegt…" : "Antwort entwerfen"}
                </Button>
              )}
            </div>
          </section>
        )}
      </div>
    </article>
  )
}
