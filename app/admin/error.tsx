"use client"

import { Heart } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { Panel } from "@/components/ui/Panel"

export default function AppError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="flex flex-1 items-center justify-center overflow-y-auto bg-bg p-4 lg:p-6">
      <Panel as="section" className="flex w-full max-w-md flex-col items-center gap-3 text-center sm:p-8">
        <span className="grid size-11 place-items-center rounded-full bg-brand-soft" aria-hidden>
          <Heart className="size-5 fill-heart text-heart" />
        </span>
        <h1 className="font-display text-xl font-bold text-ink">Etwas ist schiefgelaufen</h1>
        <p className="text-sm text-ink-2">
          Die Seite konnte nicht geladen werden. Das kann an einer instabilen Verbindung liegen. Bitte versuchen Sie es
          erneut.
        </p>
        <div className="mt-2 flex flex-wrap justify-center gap-2">
          <Button variante="sekundaer" onClick={reset}>
            Erneut versuchen
          </Button>
          {/* Ein einfacher Link auf /login würde eine noch angemeldete Person direkt
              zurück ins fehlerhafte /admin schicken (Middleware leitet dort sofort
              um). Das Abmelden-Formular beendet zuerst die Session. */}
          <form action="/abmelden" method="post">
            <Button type="submit" variante="primaer">
              Abmelden
            </Button>
          </form>
        </div>
      </Panel>
    </main>
  )
}
