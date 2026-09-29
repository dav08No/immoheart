"use client"

import { useEffect, useId, useState } from "react"
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
  const formularId = useId()

  // Beim Schliessen per X zurück auf den Auslöser, sonst landet der Fokus im Leeren
  // (der X-Knopf verschwindet). Sichtbar ist je nach Breite nur einer der beiden
  // Knöpfe (Text oder Icon) -- genau der bekommt den Fokus.
  function schliessen() {
    setFormularOffen(false)
    const ausloeser = document.querySelectorAll<HTMLElement>(`[aria-controls="${formularId}"]`)
    Array.from(ausloeser).find((el) => el.offsetParent !== null)?.focus()
  }

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
          <Button variante="primaer" icon={symbol} onClick={() => setFormularOffen(true)} aria-expanded={formularOffen} aria-controls={formularId}>
            Neues Konto
          </Button>
        }
        aktionMobil={
          <Button
            variante="primaer"
            className="size-10 px-0"
            aria-label="Neues Konto"
            aria-expanded={formularOffen}
            aria-controls={formularId}
            icon={symbol}
            onClick={() => setFormularOffen(true)}
          />
        }
      />
      <main className={SEITEN_INHALT_KLASSE}>
        {formularOffen && (
          <Panel as="section" id={formularId} className="w-full max-w-3xl">
            <PanelKopf
              titel="Neues Konto"
              aktionen={
                <Button
                  variante="dezent"
                  className="size-9 px-0"
                  aria-label="Formular schliessen"
                  icon={<X className="size-4" aria-hidden />}
                  onClick={schliessen}
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
