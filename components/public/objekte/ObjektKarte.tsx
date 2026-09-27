import Link from "next/link"
import { Heart, MapPin } from "lucide-react"
import type { OeffentlichesObjekt } from "@/lib/objektsuche"
import { formatZahl, nutzungLabel } from "./anzeige"

// Unter einer eigenen Abschnittsüberschrift (z.B. "Ähnliche Objekte") ist der Kartentitel h3.
export function ObjektKarte({ objekt, titelEbene: Titel = "h2" }: { objekt: OeffentlichesObjekt; titelEbene?: "h2" | "h3" }) {
  const reserviert = objekt.status === "reserviert"
  return (
    <Link
      href={`/objekte/${objekt.id}`}
      className="group flex w-full flex-col overflow-hidden rounded-card border border-line bg-surface outline-none hover:border-line-2 hover:shadow-md focus-visible:ring-[3px] focus-visible:ring-ring/60 motion-safe:transition-shadow"
    >
      <div className="relative aspect-[4/3] bg-heart-soft">
        {objekt.titelbild ? (
          // eslint-disable-next-line @next/next/no-img-element -- öffentliche Storage-URL, kein next/image-Loader konfiguriert
          <img src={objekt.titelbild} alt={objekt.titel} loading="lazy" className="size-full object-cover" />
        ) : (
          <div className="grid size-full place-items-center">
            <Heart className="size-10 fill-heart/20 text-heart" aria-hidden />
          </div>
        )}
        {reserviert && (
          <span className="absolute top-3 left-3 rounded-full bg-warn-bg px-2.5 py-0.5 text-xs font-semibold text-warn">
            reserviert
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <span className="w-fit rounded-full bg-brand-soft px-2 py-0.5 text-xs font-medium text-brand">
          {nutzungLabel(objekt.nutzung)}
        </span>
        <Titel className="font-display text-lg leading-snug font-bold text-ink group-hover:text-brand">{objekt.titel}</Titel>
        <p className="flex items-center gap-1 text-sm text-ink-2">
          <MapPin className="size-3.5 shrink-0" aria-hidden />
          {objekt.ort}
        </p>
        <p className="mt-auto flex items-baseline justify-between gap-2 pt-2 text-sm">
          <span className="font-semibold text-ink tabular-nums">{formatZahl(objekt.flaeche)} m²</span>
          <span className="text-ink-2 tabular-nums">
            {objekt.preis_pro_m2 !== null ? `CHF ${formatZahl(objekt.preis_pro_m2)}/m²` : "Preis auf Anfrage"}
          </span>
        </p>
      </div>
    </Link>
  )
}
