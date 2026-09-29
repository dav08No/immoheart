import { Abschnittstitel } from "@/components/ui/Abschnittstitel"
import { Feld } from "@/components/ui/Feld"
import { pulsFarbe } from "@/lib/puls"
import type { AnfrageMitFirma } from "@/lib/queries/anfragen"

const FARBE_KLASSE: Record<ReturnType<typeof pulsFarbe>, string> = {
  gut: "text-good",
  warn: "text-warn",
  kritisch: "text-crit",
}

const PUNKT_KLASSE: Record<ReturnType<typeof pulsFarbe>, string> = {
  gut: "bg-good",
  warn: "bg-warn",
  kritisch: "bg-crit",
}

// Ansicht der Suchangaben. Fehlende Werte laufen über Feld ("?"-Regel des Projekts).
export function AnfrageEckdaten({ anfrage, pulsWert }: { anfrage: AnfrageMitFirma; pulsWert: number }) {
  const farbe = pulsFarbe(pulsWert)
  return (
    <section className="flex flex-col gap-2.5">
      <Abschnittstitel>Eckdaten</Abschnittstitel>
      <div className="grid grid-cols-2 gap-2">
        <Feld label="Sucht" wert={`${anfrage.flaeche_min ?? "?"}–${anfrage.flaeche_max ?? "?"} m²`} />
        <Feld label="Ort" wert={anfrage.ort} />
        <Feld label="Budget" wert={anfrage.budget_pro_m2?.toString() ?? null} />
        <Feld label="Bezug" wert={anfrage.bezug} />
        <div className="rounded-lg border border-line px-3 py-2">
          <div className="text-xs text-ink-2">Puls</div>
          <div className={`mt-0.5 flex items-center gap-1.5 text-sm font-semibold ${FARBE_KLASSE[farbe]}`}>
            {/* Punkt nur als Zusatz; der Wert steht als Zahl daneben. */}
            <span aria-hidden className={`size-2 rounded-full ${PUNKT_KLASSE[farbe]}`} />
            {pulsWert}
          </div>
        </div>
      </div>
    </section>
  )
}
