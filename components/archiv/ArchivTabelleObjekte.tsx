"use client"

import { Tabelle } from "@/components/ui/Tabelle"
import { StatusChip } from "@/components/ui/StatusChip"
import { STATUS_LABEL } from "@/components/objekte/ObjektRaster"
import { objektStatusTon } from "@/lib/ui/status-ton"
import { formatFlaeche, formatZeitpunkt } from "@/lib/format"
import { nutzungLabel } from "@/lib/nutzung"
import { mitgeloeschtText } from "@/lib/archiv/filter"
import type { ArchivObjekt } from "@/lib/archiv/typen"
import { ArchivZeilenAktionen } from "./ArchivZeilenAktionen"
import { FEHLT, type ZeilenProps } from "./typen"

export function ArchivTabelleObjekte({ objekte, ...zeile }: { objekte: ArchivObjekt[] } & ZeilenProps) {
  return (
    <Tabelle ariaLabel="Archivierte Objekte" minBreite="min-w-[820px]">
      <thead>
        <tr>
          <th scope="col">Objekt</th>
          <th scope="col">Nutzung</th>
          <th scope="col">Fläche</th>
          <th scope="col">Status</th>
          <th scope="col">Archiviert am</th>
          <th scope="col">Grund</th>
          <th scope="col">
            <span className="sr-only">Aktionen</span>
          </th>
        </tr>
      </thead>
      <tbody>
        {objekte.map((o) => (
          <tr key={o.id}>
            <td>
              <div className="font-medium">{o.titel}</div>
              <div className="text-xs text-ink-2">{o.ort}</div>
            </td>
            <td>{nutzungLabel(o.nutzung)}</td>
            <td className="whitespace-nowrap tabular-nums">{formatFlaeche(o.flaeche)}</td>
            <td>
              <StatusChip ton={objektStatusTon(o.status)}>{STATUS_LABEL[o.status]}</StatusChip>
            </td>
            <td className="whitespace-nowrap">{formatZeitpunkt(new Date(o.archiviert_am))}</td>
            <td className="text-ink-2">{o.grund || FEHLT}</td>
            <td>
              <ArchivZeilenAktionen
                {...zeile}
                wiederherstellbar
                ziel={{ typ: "objekt", id: o.id, bezeichnung: o.titel, mitgeloescht: mitgeloeschtText(o.trefferAnzahl, o.fotoAnzahl) }}
              />
            </td>
          </tr>
        ))}
      </tbody>
    </Tabelle>
  )
}
