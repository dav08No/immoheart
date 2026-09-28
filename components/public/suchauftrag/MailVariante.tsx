import { Check, Mail } from "lucide-react"
import { Button } from "@/components/shadcn/button"
import { AdresseKopieren } from "@/components/public/AdresseKopieren"
import { IMMOHEART_MAIL, SUCHAUFTRAG_VORLAGE, mailtoLink } from "@/lib/mailto"

const CHECKLISTE = ["Firma und Branche", "Nutzung (Büro, Gewerbe, Lager …)", "Ort oder Region", "Fläche in m² (von–bis)", "Budget pro m²", "Gewünschter Bezug"]

export function MailVariante() {
  return (
    <section aria-labelledby="mail-titel" className="flex flex-col gap-4 rounded-card border border-line bg-surface-2 p-6">
      <h2 id="mail-titel" className="font-display text-xl font-bold text-ink">Lieber per Mail?</h2>
      <p className="text-ink-2">Schreiben Sie uns formlos. Diese Angaben helfen uns bei der Suche:</p>
      <ul className="flex flex-col gap-1.5 text-sm text-ink-2">
        {CHECKLISTE.map((punkt) => (
          <li key={punkt} className="flex items-start gap-2">
            <Check className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden />
            {punkt}
          </li>
        ))}
      </ul>
      <p className="break-all font-medium text-ink">{IMMOHEART_MAIL}</p>
      <div className="flex flex-wrap items-start gap-2">
        <AdresseKopieren />
        <Button asChild>
          <a href={mailtoLink(SUCHAUFTRAG_VORLAGE.betreff, SUCHAUFTRAG_VORLAGE.text)}>
            <Mail aria-hidden />
            Mail mit Vorlage öffnen
          </a>
        </Button>
      </div>
    </section>
  )
}
