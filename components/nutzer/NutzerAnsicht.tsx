"use client"

import { useEffect, useState } from "react"
import { UserPlus, X } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { Leerzustand } from "@/components/ui/Leerzustand"
import { Panel, PanelKopf } from "@/components/ui/Panel"
import { Seitenkopf, SEITEN_INHALT_KLASSE } from "@/components/layout/Seitenkopf"
import { kontextNutzer } from "@/lib/admin/kontext"
import type { Konto } from "@/lib/queries/nutzer"
import { NutzerListe } from "./NutzerListe"
import { NeuesKontoFormular, NAME_FELD_ID } from "./NeuesKontoFormular"

export function NutzerAnsicht({ konten, eigeneUserId }: { konten: Konto[]; eigeneUserId: string }) {
  const [formularOffen, setFormularOffen] = useState(false)
  const aktiv = konten.filter((k) => k.status === "aktiv").length
  const eingeladen = konten.filter((k) => k.status === "eingeladen").length
  const symbol = <UserPlus className="size-4" aria-hidden />

  // Nach dem Öffnen direkt ins erste Feld, damit Tastatur-Nutzer nicht suchen müssen.
  useEffect(() => {
    if (formularOffen) document.getElementById(NAME_FELD_ID)?.focus()
  }, [formularOffen])

  return (
    <>
      <Seitenkopf
        titel="Nutzer"
        kontext={kontextNutzer(aktiv, eingeladen)}
        aktion={
          <Button variante="primaer" icon={symbol} onClick={() => setFormularOffen(true)} aria-expanded={formularOffen}>
            Neues Konto
          </Button>
        }
        aktionMobil={
          <Button
            variante="primaer"
            className="size-10 px-0"
            aria-label="Neues Konto"
            aria-expanded={formularOffen}
            icon={symbol}
            onClick={() => setFormularOffen(true)}
          />
        }
      />
      <main className={SEITEN_INHALT_KLASSE}>
        {formularOffen && (
          <Panel as="section" className="w-full max-w-3xl">
            <PanelKopf
              titel="Neues Konto"
              aktionen={
                <Button
                  variante="dezent"
                  className="size-9 px-0"
                  aria-label="Formular schliessen"
                  icon={<X className="size-4" aria-hidden />}
                  onClick={() => setFormularOffen(false)}
                />
              }
            />
            <NeuesKontoFormular />
          </Panel>
        )}
        <Panel as="section" polster={false}>
          {konten.length === 0 ? (
            <Leerzustand text="Noch keine Konten." />
          ) : (
            <NutzerListe konten={konten} eigeneUserId={eigeneUserId} />
          )}
        </Panel>
      </main>
    </>
  )
}
