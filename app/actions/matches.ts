"use server"

import { revalidatePath } from "next/cache"
import { entwurfAngebot, entwurfNachfass } from "@/lib/ki/entwuerfe"
import { legeNachrichtAn } from "@/lib/queries/nachrichten"
import { holeAnfrage, holeFirma, zuAnfrageDomain } from "@/lib/queries/anfragen"
import { holeObjekt, zuObjektDomain } from "@/lib/queries/objekte"
import { erstelleServerClient } from "@/lib/supabase/server"
import type { Kriterium } from "@/types"

// Bewusst kein Fallback auf eine generische Platzhalter-Adresse (z.B.
// "kontakt@example.ch"): dieselbe Begründung wie parseMailAntwort
// (lib/ki/entwuerfe.ts) beim Verzicht auf einen leeren body-Platzhalter --
// eine erfundene Adresse würde einen Entwurf erzeugen, der beim späteren
// Senden nie ein echtes Postfach erreicht, ohne dass das je auffiele. Fehlt
// ein echter Empfänger, ist ein geworfener Fehler (Entwurf wird nicht
// angelegt) der einzige Weg, der das verhindert.
async function empfaengerFuerAnfrage(firmaId: string | null): Promise<string> {
  if (!firmaId) throw new Error("Anfrage hat keine verknüpfte Firma -- kein Empfänger für den Versand vorhanden")
  const firma = await holeFirma(firmaId)
  if (!firma?.kontakt_email) {
    throw new Error("Firma hat keine hinterlegte Kontakt-E-Mail -- kein Empfänger für den Versand vorhanden")
  }
  return firma.kontakt_email
}

// Ein UPDATE ohne betroffene Zeile ist für PostgREST kein Fehler -- deshalb
// die zurückgegebene id prüfen, statt einen stillen Fehlschlag als Erfolg zu melden.
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

  await legeNachrichtAn({
    richtung: "entwurf",
    typ: "angebot",
    anfrage_id: anfrage.id,
    match_id: matchId,
    von: "kontakt@espaceso.ch",
    an: empfaenger,
    betreff: entwurf.betreff,
    body: entwurf.body,
  })

  await aktualisiereMatchStatus(matchId, "gesendet")

  revalidatePath("/admin")
  revalidatePath("/admin/postfach")
}

export async function matchVerwerfen(matchId: string): Promise<void> {
  await aktualisiereMatchStatus(matchId, "verworfen")
  revalidatePath("/admin")
}

export async function anfrageNachfragen(anfrageId: string): Promise<void> {
  const anfrageRow = await holeAnfrage(anfrageId)
  if (!anfrageRow) throw new Error("Anfrage nicht gefunden")

  const anfrage = zuAnfrageDomain(anfrageRow)
  const tage = Math.floor((Date.now() - anfrage.letzterKontakt.getTime()) / 86_400_000)
  const entwurf = await entwurfNachfass(anfrage, tage)
  const empfaenger = await empfaengerFuerAnfrage(anfrageRow.firma_id)

  await legeNachrichtAn({
    richtung: "entwurf",
    typ: "nachfass",
    anfrage_id: anfrage.id,
    von: "kontakt@espaceso.ch",
    an: empfaenger,
    betreff: entwurf.betreff,
    body: entwurf.body,
  })

  revalidatePath("/admin")
  revalidatePath("/admin/postfach")
}
