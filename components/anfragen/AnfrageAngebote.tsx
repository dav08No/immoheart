"use client"

import { Abschnittstitel } from "@/components/ui/Abschnittstitel"
import { Leerzustand } from "@/components/ui/Leerzustand"
import { ListenZeile } from "@/components/ui/ListenZeile"
import { StatusChip } from "@/components/ui/StatusChip"
import { AbschlussAktionen } from "@/components/abschluss/AbschlussAktionen"
import { formatZeitpunkt } from "@/lib/format"
import { TREFFER_STATUS_LABEL } from "@/lib/abschluss/uebergaenge"
import { trefferStatusTon } from "@/lib/ui/status-ton"
import type { Angebot } from "@/lib/abschluss/angebote"
import type { Database } from "@/types/database"

type AnfrageStatus = Database["public"]["Enums"]["anfrage_status_enum"]

type Props = { angebote: Angebot[]; anfrageStatus: AnfrageStatus; onFertig: () => void }

// Alle Treffer der Anfrage ab "Angeboten" mit den Abschluss-Aktionen je Status (Spec §3).
export function AnfrageAngebote({ angebote, anfrageStatus, onFertig }: Props) {
  return (
    <section className="flex flex-col gap-2">
      <Abschnittstitel>Angebote</Abschnittstitel>
      {angebote.length === 0 ? (
        <Leerzustand klein text="Noch keine Angebote gesendet." />
      ) : (
        <ul className="flex flex-col">
          {angebote.map((a) => (
            <li key={a.id} className="flex flex-col gap-1 border-b border-line pb-2.5 last:border-b-0">
              <ListenZeile
                titel={a.objekt.titel}
                unterzeile={a.angeboten_am ? `Angeboten am ${formatZeitpunkt(new Date(a.angeboten_am))}` : undefined}
                badges={<StatusChip ton={trefferStatusTon(a.status)}>{TREFFER_STATUS_LABEL[a.status]}</StatusChip>}
              />
              {/* Andere Firmen behalten ihr Angebot, bis der Vertrag unterschrieben ist. */}
              {a.reserviertFuer && (
                <p className="px-3 text-xs text-ink-2 wrap-break-word">Objekt reserviert für {a.reserviertFuer}</p>
              )}
              <div className="px-3">
                <AbschlussAktionen
                  matchId={a.id}
                  objektId={a.objekt.id}
                  bezeichnung={a.objekt.titel}
                  trefferStatus={a.status}
                  objektStatus={a.objekt.status}
                  anfrageStatus={anfrageStatus}
                  andereAngebote={a.andereAngebote}
                  fehlendeEntwuerfe={a.fehlendeEntwuerfe}
                  onFertig={onFertig}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
