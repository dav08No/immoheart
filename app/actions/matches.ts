"use server"

import { revalidatePath } from "next/cache"
import { entwurfAngebot, entwurfNachfass } from "@/lib/ki/entwuerfe"
import { legeNachrichtAn } from "@/lib/queries/nachrichten"
import { holeAnfrage, holeFirma, zuAnfrageDomain } from "@/lib/queries/anfragen"
import { holeObjekt, zuObjektDomain } from "@/lib/queries/objekte"
import { erstelleServerClient } from "@/lib/supabase/server"
import { sendeWennFreigegeben } from "./nachrichten"
import type { Kriterium } from "@/types"

// Bewusst kein Fallback auf eine generische Platzhalter-Adresse (z.B.
// "kontakt@example.ch"): dieselbe Begründung wie parseMailAntwort
// (lib/ki/entwuerfe.ts) beim Verzicht auf einen leeren body-Platzhalter --
// der erzeugte Entwurf kann über sendeWennFreigegeben bei Freigabestufe 2/3
// automatisch und ohne menschliche Ansicht als "gesendet" markiert werden.
// Eine erfundene Adresse würde dann eine Nachricht erzeugen, die die App als
// erfolgreich verschickt ausweist, obwohl sie nie ein echtes Postfach
// erreicht hat -- und niemand hätte je die Chance, das zu bemerken. Fehlt ein
// echter Empfänger, ist ein geworfener Fehler (Entwurf wird nicht angelegt)
// der einzige Weg, der das verhindert.
async function empfaengerFuerAnfrage(firmaId: string | null): Promise<string> {
  if (!firmaId) throw new Error("Anfrage hat keine verknüpfte Firma -- kein Empfänger für den Versand vorhanden")
  const firma = await holeFirma(firmaId)
  if (!firma?.kontakt_email) {
    throw new Error("Firma hat keine hinterlegte Kontakt-E-Mail -- kein Empfänger für den Versand vorhanden")
  }
  return firma.kontakt_email
}

// Gleiches Muster wie aktualisiereAnfrage/aktualisiereObjekt (M6/M7
// Whole-Branch-Review): "vermittler aendert matches" (20260922195659_rls.sql)
// schränkt das UPDATE per USING auf current_rolle() in ('admin',
// 'vermittler') ein, während "eingeloggt liest matches" jede eingeloggte
// Rolle lesen lässt. Ein RLS-gefiltertes UPDATE ohne betroffene Zeile ist aus
// Client-Sicht ein Erfolg ohne Fehler -- ohne `.select("id").maybeSingle()`
// plus explizitem Null-Check würde ein leser hier scheinbar erfolgreich
// speichern, obwohl nichts persistiert wurde. Anders als bei
// holeOffeneAnfragen (nur intern über einen bereits RLS-gesperrten Pfad
// erreichbar) sind matchSenden/matchVerwerfen exportierte Server Actions,
// die von jeder eingeloggten Rolle direkt aufgerufen werden können, unabhängig
// davon, welche UI Task 65 dafür baut -- der Schutz muss also hier an der
// Schreibstelle selbst sitzen, nicht sich zufällig aus der Aufrufreihenfolge
// ergeben.
async function aktualisiereMatchStatus(matchId: string, status: "gesendet" | "verworfen"): Promise<void> {
  const supabase = await erstelleServerClient()
  const { data, error } = await supabase.from("matches").update({ status }).eq("id", matchId).select("id").maybeSingle()
  if (error) throw error
  if (!data) throw new Error("Match konnte nicht aktualisiert werden")
}

export async function matchSenden(matchId: string): Promise<void> {
  const supabase = await erstelleServerClient()
  const { data: matchRow, error } = await supabase.from("matches").select("*").eq("id", matchId).single()
  if (error) throw error

  const [anfrageRow, objektRow] = await Promise.all([holeAnfrage(matchRow.anfrage_id), holeObjekt(matchRow.objekt_id)])
  if (!anfrageRow || !objektRow) throw new Error("Anfrage oder Objekt nicht gefunden")

  const anfrage = zuAnfrageDomain(anfrageRow)
  const objekt = zuObjektDomain(objektRow)
  const entwurf = await entwurfAngebot(anfrage, objekt, matchRow.kriterien as Kriterium[], matchRow.hinweis)
  const empfaenger = await empfaengerFuerAnfrage(anfrageRow.firma_id)

  const nachricht = await legeNachrichtAn({
    richtung: "entwurf",
    typ: "angebot",
    anfrage_id: anfrage.id,
    match_id: matchId,
    von: "kontakt@espaceso.ch",
    an: empfaenger,
    betreff: entwurf.betreff,
    body: entwurf.body,
  })
  // Angebote gehen laut README nur auf Freigabestufe 3 automatisch raus.
  await sendeWennFreigegeben(nachricht, 3)

  await aktualisiereMatchStatus(matchId, "gesendet")

  revalidatePath("/")
  revalidatePath("/postfach")
}

export async function matchVerwerfen(matchId: string): Promise<void> {
  await aktualisiereMatchStatus(matchId, "verworfen")
  revalidatePath("/")
}

export async function anfrageNachfragen(anfrageId: string): Promise<void> {
  const anfrageRow = await holeAnfrage(anfrageId)
  if (!anfrageRow) throw new Error("Anfrage nicht gefunden")

  const anfrage = zuAnfrageDomain(anfrageRow)
  const tage = Math.floor((Date.now() - anfrage.letzterKontakt.getTime()) / 86_400_000)
  const entwurf = await entwurfNachfass(anfrage, tage)
  const empfaenger = await empfaengerFuerAnfrage(anfrageRow.firma_id)

  const nachricht = await legeNachrichtAn({
    richtung: "entwurf",
    typ: "nachfass",
    anfrage_id: anfrage.id,
    von: "kontakt@espaceso.ch",
    an: empfaenger,
    betreff: entwurf.betreff,
    body: entwurf.body,
  })
  // Spec-Annahme A2: Nachfass wie Rückfrage, automatischer Versand ab Stufe 2.
  await sendeWennFreigegeben(nachricht, 2)

  revalidatePath("/")
  revalidatePath("/postfach")
}
