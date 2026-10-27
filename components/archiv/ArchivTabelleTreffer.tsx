"use client"

import { Tabelle } from "@/components/ui/Tabelle"
import { StatusChip } from "@/components/ui/StatusChip"
import { TREFFER_STATUS_LABEL } from "@/lib/abschluss/uebergaenge"
import { trefferStatusTon } from "@/lib/ui/status-ton"
import { formatZeitpunkt } from "@/lib/format"
import type { ArchivTreffer } from "@/lib/archiv/typen"
import { ArchivZeilenAktionen } from "./ArchivZeilenAktionen"
import { FEHLT, type ZeilenProps } from "./typen"

// Nur lesbar (Spec §1); Admins können einen Eintrag endgültig löschen.
export function ArchivTabelleTreffer({ treffer, ...zeile }: { treffer: ArchivTreffer[] } & ZeilenProps) {
  return (
    <Tabelle ariaLabel="Archivierte Treffer" minBreite="min-w-[860px]">
      <thead>
        <tr>
          <th scope="col">Firma</th>
          <th scope="col">Objekt</th>
          <th scope="col">Status beim Archivieren</th>
          <th scope="col">Score</th>
          <th scope="col">Angeboten am</th>
          <th scope="col">Archiviert am</th>
          <th scope="col">Grund</th>
          {zeile.istAdmin && (
            <th scope="col">
              <span className="sr-only">Aktionen</span>
            </th>
          )}
        </tr>
      </thead>
      <tbody>
        {treffer.map((t) => {
          const bezeichnung = `Treffer ${t.firma ?? FEHLT} · ${t.objekt ?? FEHLT}`
          return (
            <tr key={t.id}>
              <td className="font-medium">{t.firma ?? FEHLT}</td>
              <td>{t.objekt ?? FEHLT}</td>
              <td>
                <StatusChip ton={trefferStatusTon(t.status)}>{TREFFER_STATUS_LABEL[t.status]}</StatusChip>
              </td>
              <td className="tabular-nums">{t.score}%</td>
              <td className="whitespace-nowrap">{t.angeboten_am ? formatZeitpunkt(new Date(t.angeboten_am)) : FEHLT}</td>
              <td className="whitespace-nowrap">{formatZeitpunkt(new Date(t.archiviert_am))}</td>
              <td className="text-ink-2">{t.grund}</td>
              {zeile.istAdmin && (
                <td>
                  <ArchivZeilenAktionen
                    {...zeile}
                    wiederherstellbar={false}
                    ziel={{ typ: "treffer", id: t.id, bezeichnung, mitgeloescht: null }}
                  />
                </td>
              )}
            </tr>
          )
        })}
      </tbody>
    </Tabelle>
  )
}
