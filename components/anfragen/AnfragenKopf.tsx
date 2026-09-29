"use client"

import { useState } from "react"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { Drawer } from "@/components/layout/Drawer"
import { Seitenkopf } from "@/components/layout/Seitenkopf"
import { kontextAnfragen } from "@/lib/admin/kontext"
import { AnfrageFormular } from "./AnfrageFormular"

// Client, weil die Hauptaktion den "Neue Anfrage"-Drawer öffnet (State). Der Seitenkopf
// steht VOR <main> und kann AnfragenAnsicht nicht steuern -- deshalb lebt der Drawer
// hier (wie NeueMailDialog in EntwuerfeKopf). Er bleibt gemountet, damit die
// Schliessen-Transition spielt.
export function AnfragenKopf({ offen, vermittelt }: { offen: number; vermittelt: number }) {
  const [neuOffen, setNeuOffen] = useState(false)
  const symbol = <Plus className="size-4" aria-hidden />

  return (
    <>
      <Seitenkopf
        titel="Anfragen"
        kontext={kontextAnfragen(offen, vermittelt)}
        aktion={
          <Button variante="primaer" icon={symbol} onClick={() => setNeuOffen(true)}>
            Anfrage anlegen
          </Button>
        }
        aktionMobil={
          <Button
            variante="primaer"
            className="size-10 px-0"
            aria-label="Anfrage anlegen"
            icon={symbol}
            onClick={() => setNeuOffen(true)}
          />
        }
      />
      <Drawer offen={neuOffen} titel="Neue Anfrage" untertitel="" onSchliessen={() => setNeuOffen(false)}>
        <AnfrageFormular onFertig={() => setNeuOffen(false)} />
      </Drawer>
    </>
  )
}
