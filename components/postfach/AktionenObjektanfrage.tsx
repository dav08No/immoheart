"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { FilePen } from "lucide-react"
import { Feld } from "@/components/ui/Feld"
import { Button } from "@/components/ui/Button"
import { alsAnfrageSpeichern } from "@/app/actions/nachrichten"
import { objektanfrageFelder } from "@/lib/eingang/anfrage-aus-objektanfrage"
import type { PostfachNachricht } from "@/lib/queries/postfach"
import type { AktionAusfuehren, EntwurfVerweis, ObjektOption } from "./typen"

const LINK = "text-sm hover:underline focus-visible:outline-2 focus-visible:outline-ring"

type Props = {
  nachricht: PostfachNachricht
  objekte: ObjektOption[]
  entwurf: EntwurfVerweis | undefined
  laufend: string | null
  ausfuehren: AktionAusfuehren
}

// Anfrage über das Website-Formular zu einem bestimmten Objekt (Konstraint N5: es
// entsteht nur ein Entwurf, gesendet wird erst aus dem Editor).
export function AktionenObjektanfrage({ nachricht, objekte, entwurf, laufend, ausfuehren }: Props) {
  const router = useRouter()
  const felder = objektanfrageFelder(nachricht.erkannte_felder)
  const objekt = objekte.find((o) => o.id === nachricht.objekt_id)
  const gespeichert = nachricht.anfrage_id !== null

  return (
    <section aria-label="Objektanfrage" className="mt-4">
      <div className="mb-2.5 border-b border-line pb-1.5 text-xs text-ink-3">Anfrage zu einem Objekt</div>
      {felder ? (
        <>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Feld label="Firma" wert={felder.firma} />
            <Feld label="Name" wert={felder.name} />
            <Feld label="E-Mail" wert={felder.email} />
            <Feld label="Telefon" wert={felder.telefon} optional />
          </div>
          {/* Nur Text, nie HTML: die Besucherin hat das frei eingetippt. */}
          <p className="mt-2 whitespace-pre-wrap wrap-break-word rounded-lg border border-line p-3 text-sm text-ink-2">{felder.nachricht}</p>
        </>
      ) : (
        <p className="text-xs text-ink-3">Keine Formularangaben gefunden.</p>
      )}
      <div className="mt-2.5">
        {objekt ? (
          <Link href={`/admin/objekte?id=${objekt.id}`} className={`${LINK} text-brand`}>
            Objekt: {objekt.label} · öffnen
          </Link>
        ) : (
          <p className="text-xs text-crit">Das angefragte Objekt existiert nicht mehr.</p>
        )}
      </div>
      <div className="mt-3.5 flex flex-wrap items-center gap-2">
        {entwurf && (
          <Button onClick={() => router.push(`/admin/entwuerfe?id=${entwurf.id}`)}>
            <FilePen className="size-4" aria-hidden />
            Entwurf öffnen
          </Button>
        )}
        {gespeichert ? (
          <Link href={`/admin/anfragen?id=${nachricht.anfrage_id}`} className={`${LINK} text-good`}>
            Als Anfrage gespeichert · öffnen
          </Link>
        ) : (
          <Button
            variante="primaer"
            disabled={!felder || !objekt || laufend !== null}
            onClick={() =>
              void ausfuehren("speichern", () => alsAnfrageSpeichern(nachricht.id), "Anfrage gespeichert.")
            }
          >
            {laufend === "speichern" ? "Wird gespeichert…" : "Als Anfrage speichern"}
          </Button>
        )}
      </div>
    </section>
  )
}
