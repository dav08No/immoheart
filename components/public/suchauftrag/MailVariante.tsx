"use client"

import { useEffect, useState } from "react"
import { Check, Copy, Mail } from "lucide-react"
import { Button } from "@/components/shadcn/button"
import { IMMOHEART_MAIL, SUCHAUFTRAG_VORLAGE, mailtoLink } from "@/lib/mailto"

const CHECKLISTE = ["Firma und Branche", "Nutzung (Büro, Gewerbe, Lager …)", "Ort oder Region", "Fläche in m² (von–bis)", "Budget pro m²", "Gewünschter Bezug"]

type Kopierstatus = "bereit" | "kopiert" | "nicht_moeglich"

export function MailVariante() {
  const [status, setStatus] = useState<Kopierstatus>("bereit")

  // "Kopiert" nur kurz zeigen, danach kann erneut kopiert werden.
  useEffect(() => {
    if (status !== "kopiert") return
    const timer = setTimeout(() => setStatus("bereit"), 2500)
    return () => clearTimeout(timer)
  }, [status])

  async function kopieren() {
    // Ohne sicheren Kontext (http) oder bei verweigerter Berechtigung gibt es kein
    // Clipboard -- dann die Adresse zum Abschreiben/Markieren nennen.
    try {
      if (!navigator.clipboard) throw new Error("Kein Clipboard")
      await navigator.clipboard.writeText(IMMOHEART_MAIL)
      setStatus("kopiert")
    } catch {
      setStatus("nicht_moeglich")
    }
  }

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
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" onClick={() => void kopieren()}>
          {status === "kopiert" ? <Check aria-hidden /> : <Copy aria-hidden />}
          {status === "kopiert" ? "Kopiert" : "Adresse kopieren"}
        </Button>
        <Button asChild>
          <a href={mailtoLink(SUCHAUFTRAG_VORLAGE.betreff, SUCHAUFTRAG_VORLAGE.text)}>
            <Mail aria-hidden />
            Mail mit Vorlage öffnen
          </a>
        </Button>
      </div>
      {/* Rückmeldung für Screenreader; sichtbar nur der Fallback-Hinweis. */}
      <p role="status" className="text-sm text-ink-3">
        {status === "kopiert" && <span className="sr-only">Adresse kopiert.</span>}
        {status === "nicht_moeglich" && "Kopieren ist hier nicht möglich. Bitte markieren Sie die Adresse oben."}
      </p>
    </section>
  )
}
