import Link from "next/link"
import { Feld } from "@/components/ui/Feld"
import { buttonVariants } from "@/components/shadcn/button"
import { objektDatenAus } from "@/lib/postfach"
import { formatFlaeche, formatPreis } from "@/lib/format"
import type { PostfachNachricht } from "@/lib/queries/postfach"
import { nutzungLabel } from "./typen"

export function AktionenObjektangebot({ nachricht }: { nachricht: PostfachNachricht }) {
  const objekt = objektDatenAus(nachricht.erkannte_felder)

  return (
    <section aria-label="Objektangebot" className="mt-4">
      <div className="mb-2.5 border-b border-line pb-1.5 text-xs text-ink-3">Angebotenes Objekt</div>
      {objekt ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <Feld label="Titel" wert={objekt.titel} />
          <Feld label="Adresse" wert={objekt.adresse} />
          <Feld label="Ort" wert={objekt.ort} />
          <Feld label="Fläche" wert={objekt.flaeche === null ? null : formatFlaeche(objekt.flaeche)} />
          <Feld label="Preis" wert={objekt.preis_pro_m2 === null ? null : formatPreis(objekt.preis_pro_m2)} />
          <Feld label="Nutzung" wert={nutzungLabel(objekt.nutzung)} />
          <Feld label="Verfügbar ab" wert={objekt.verfuegbar_ab} />
        </div>
      ) : (
        <p className="text-xs text-ink-3">Keine Objektdaten erkannt.</p>
      )}
      {objekt?.beschreibung && <p className="mt-2 whitespace-pre-wrap text-sm text-ink-2">{objekt.beschreibung}</p>}
      <div className="mt-3.5">
        {nachricht.objekt_id ? (
          <Link href="/admin/objekte" className="text-sm text-good hover:underline focus-visible:outline-2 focus-visible:outline-ring">
            Bereits als Objekt übernommen · Objekte öffnen
          </Link>
        ) : (
          <Link href={`/admin/objekte?aus=${nachricht.id}`} className={buttonVariants({ size: "sm" })}>
            Als Objekt übernehmen
          </Link>
        )}
      </div>
    </section>
  )
}
