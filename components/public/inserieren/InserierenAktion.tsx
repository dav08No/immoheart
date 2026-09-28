import { Camera, Check, Mail } from "lucide-react"
import { Button } from "@/components/shadcn/button"
import { AdresseKopieren } from "@/components/public/AdresseKopieren"
import { IMMOHEART_MAIL, INSERIEREN_VORLAGE, mailtoLink } from "@/lib/mailto"

const CHECKLISTE = ["Adresse", "Fläche in m²", "Preis (CHF pro m²)", "Nutzung (Büro, Gewerbe, Produktion, Lager, Verkauf, Bauland)", "Verfügbarkeit"]

export function InserierenAktion() {
  return (
    <section aria-labelledby="inserieren-titel" className="flex flex-col gap-4 rounded-card border border-line bg-surface-2 p-6">
      <h2 id="inserieren-titel" className="font-display text-xl font-bold text-ink">Objekt melden</h2>
      <p className="text-ink-2">Schreiben Sie uns formlos oder mit unserer Vorlage. Diese Angaben helfen uns:</p>
      <ul className="flex flex-col gap-1.5 text-sm text-ink-2">
        {CHECKLISTE.map((punkt) => (
          <li key={punkt} className="flex items-start gap-2">
            <Check className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden />
            {punkt}
          </li>
        ))}
        {/* Ohne Fotos verzögert sich die Prüfung am meisten -- deshalb separat hervorgehoben. */}
        <li className="flex items-start gap-2 rounded-md bg-warn-bg px-2 py-1.5 font-medium text-warn">
          <Camera className="mt-0.5 size-4 shrink-0" aria-hidden />
          Fotos als Anhang mitsenden
        </li>
      </ul>
      <p className="break-all font-medium text-ink">{IMMOHEART_MAIL}</p>
      <div className="flex flex-wrap items-start gap-2">
        <AdresseKopieren />
        <Button asChild>
          <a href={mailtoLink(INSERIEREN_VORLAGE.betreff, INSERIEREN_VORLAGE.text)}>
            <Mail aria-hidden />
            Mail mit Vorlage öffnen
          </a>
        </Button>
      </div>
    </section>
  )
}
