import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { cache } from "react"
import { ArrowLeft, MapPin } from "lucide-react"
import { z } from "zod"
import { aehnlicheObjekte } from "@/lib/objektsuche"
import { holeOeffentlicheFotos, holeOeffentlicheObjekte, holeOeffentlichesObjekt } from "@/lib/queries/oeffentlich"
import { erstelleZeitToken } from "@/lib/formular-schutz"
import { formularGeheimnis } from "@/lib/formular-geheimnis"
import { AehnlicheObjekte } from "@/components/public/objekte/AehnlicheObjekte"
import { AnfrageFormular } from "@/components/public/objekte/AnfrageFormular"
import { Eckdaten } from "@/components/public/objekte/Eckdaten"
import { Galerie } from "@/components/public/objekte/Galerie"
import { nutzungLabel } from "@/components/public/objekte/anzeige"
import {
  eigenschaftChips, heuteInZuerich, kartenUrl, metaBeschreibung, metaTitel, vorbelegteNachricht,
} from "@/components/public/objekte/detail"

type Props = { params: Promise<{ id: string }> }

// generateMetadata und die Seite brauchen dasselbe Objekt -- einmal pro Anfrage laden.
// z.guid statt z.uuid: Postgres-IDs ohne RFC-Variante (Seed-Objekte) sind gültig.
const ladeObjekt = cache(async (id: string) => {
  if (!z.guid().safeParse(id).success) return null
  return holeOeffentlichesObjekt(id)
})

// Fehlt das Geheimnis, soll die Seite trotzdem erscheinen; die Action meldet
// dann beim Senden einen freundlichen Fehler statt einer Fehlerseite.
function neuesZeitToken(): string {
  try {
    return erstelleZeitToken(Date.now(), formularGeheimnis())
  } catch (fehler) {
    console.error("Objektseite: Zeit-Token fehlgeschlagen", fehler)
    return ""
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const objekt = await ladeObjekt(id)
  if (!objekt) notFound()
  const titel = metaTitel(objekt)
  const beschreibung = metaBeschreibung(objekt)
  return {
    // absolute, weil das Root-Layout sonst ein zweites "· immoheart" anhängt.
    title: { absolute: titel },
    description: beschreibung,
    openGraph: {
      title: titel,
      description: beschreibung,
      images: objekt.titelbild ? [{ url: objekt.titelbild }] : undefined,
    },
  }
}

export default async function ObjektDetailPage({ params }: Props) {
  const { id } = await params
  const objekt = await ladeObjekt(id)
  if (!objekt) notFound()

  const [fotos, alle] = await Promise.all([holeOeffentlicheFotos(objekt.id), holeOeffentlicheObjekte()])
  const aehnliche = aehnlicheObjekte(alle, objekt, 3)
  const chips = eigenschaftChips(objekt.eigenschaften)
  const heute = heuteInZuerich(new Date())

  return (
    <article className="mx-auto flex max-w-6xl flex-col gap-12 px-4 py-10">
      <div className="flex flex-col gap-6">
        <Link href="/objekte" className="flex w-fit items-center gap-1.5 text-sm font-medium text-brand underline-offset-4 hover:underline">
          <ArrowLeft className="size-4" aria-hidden />
          Alle Objekte
        </Link>
        <header className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-brand-soft px-2.5 py-0.5 text-xs font-medium text-brand">{nutzungLabel(objekt.nutzung)}</span>
            {objekt.status === "reserviert" && (
              <span className="rounded-full bg-warn-bg px-2.5 py-0.5 text-xs font-semibold text-warn">reserviert</span>
            )}
          </div>
          <h1 className="font-display text-3xl font-bold text-ink sm:text-4xl">{objekt.titel}</h1>
          <p className="flex items-center gap-1 text-ink-2">
            <MapPin className="size-4 shrink-0" aria-hidden />
            {objekt.ort}
          </p>
        </header>
      </div>

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="flex min-w-0 flex-col gap-10">
          <Galerie fotos={fotos} titel={objekt.titel} />

          {objekt.beschreibung?.trim() && (
            <section aria-labelledby="beschreibung" className="flex flex-col gap-3">
              <h2 id="beschreibung" className="font-display text-2xl font-bold text-ink">Beschreibung</h2>
              <p className="whitespace-pre-line text-ink-2">{objekt.beschreibung.trim()}</p>
            </section>
          )}

          {chips.length > 0 && (
            <section aria-labelledby="eigenschaften" className="flex flex-col gap-3">
              <h2 id="eigenschaften" className="font-display text-2xl font-bold text-ink">Eigenschaften</h2>
              <ul className="flex flex-wrap gap-2">
                {chips.map((chip) => (
                  <li key={chip} className="rounded-full border border-line-2 bg-surface px-3 py-1 text-sm text-ink-2">{chip}</li>
                ))}
              </ul>
            </section>
          )}

          <section aria-labelledby="lage" className="flex flex-col gap-3">
            <h2 id="lage" className="font-display text-2xl font-bold text-ink">Lage</h2>
            <iframe
              src={kartenUrl(objekt.ort)}
              title={`Karte: ${objekt.ort}`}
              loading="lazy"
              referrerPolicy="no-referrer"
              className="aspect-[16/9] w-full rounded-card border border-line"
            />
            <p className="text-sm text-ink-3">Die genaue Adresse nennen wir Ihnen gerne auf Anfrage.</p>
          </section>
        </div>

        <aside className="flex flex-col gap-6 lg:self-start" aria-label="Eckdaten und Anfrage">
          <Eckdaten objekt={objekt} heute={heute} />
          <AnfrageFormular objektId={objekt.id} zeitToken={neuesZeitToken()} nachrichtVorlage={vorbelegteNachricht(objekt.titel)} />
        </aside>
      </div>

      <AehnlicheObjekte objekte={aehnliche} />
    </article>
  )
}
