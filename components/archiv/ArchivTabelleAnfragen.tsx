"use client"

import { Tabelle } from "@/components/ui/Tabelle"
import { StatusChip } from "@/components/ui/StatusChip"
import { ANFRAGE_STATUS_LABEL } from "@/components/anfragen/typen"
import { anfrageStatusTon } from "@/lib/ui/status-ton"
import { formatZeitpunkt } from "@/lib/format"
import { mitgeloeschtText } from "@/lib/archiv/filter"
import type { ArchivAnfrage } from "@/lib/archiv/typen"
import { ArchivZeilenAktionen } from "./ArchivZeilenAktionen"
import { FEHLT, type ZeilenProps } from "./typen"

export function ArchivTabelleAnfragen({ anfragen, ...zeile }: { anfragen: ArchivAnfrage[] } & ZeilenProps) {
  return (
    <Tabelle ariaLabel="Archivierte Anfragen" minBreite="min-w-[820px]">
      <thead>
        <tr>
          <th scope="col">Firma</th>
          <th scope="col">Eckdaten</th>
          <th scope="col">Status</th>
          <th scope="col">Archiviert am</th>
          <th scope="col">Grund</th>
          <th scope="col">
            <span className="sr-only">Aktionen</span>
          </th>
        </tr>
      </thead>
      <tbody>
        {anfragen.map((a) => {
          const bezeichnung = `Anfrage ${a.firma ?? "ohne Firma"}`
          return (
            <tr key={a.id}>
              <td className="font-medium">{a.firma ?? FEHLT}</td>
              <td className="text-ink-2">{a.eckdaten ?? FEHLT}</td>
              <td>
                <StatusChip ton={anfrageStatusTon(a.status)}>{ANFRAGE_STATUS_LABEL[a.status]}</StatusChip>
              </td>
              <td className="whitespace-nowrap">{formatZeitpunkt(new Date(a.archiviert_am))}</td>
              <td className="text-ink-2">{a.grund || FEHLT}</td>
              <td>
                <ArchivZeilenAktionen
                  {...zeile}
                  wiederherstellbar
                  ziel={{ typ: "anfrage", id: a.id, bezeichnung, mitgeloescht: mitgeloeschtText(a.trefferAnzahl, null) }}
                />
              </td>
            </tr>
          )
        })}
      </tbody>
    </Tabelle>
  )
}
