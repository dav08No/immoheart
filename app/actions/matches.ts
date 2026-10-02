"use server"

import { revalidatePath } from "next/cache"
import { entwurfAngebot, entwurfNachfass } from "@/lib/ki/entwuerfe"
import { legeNachrichtAn, loescheOffenenAngebotsEntwurf } from "@/lib/queries/nachrichten"
import { betreffFuerAnfrage } from "@/lib/abschluss/betreff"
import { holeAnfrage, holeFirma, zuAnfrageDomain } from "@/lib/queries/anfragen"
import { holeObjekt, zuObjektDomain } from "@/lib/queries/objekte"
import { holeEigenesProfil } from "@/lib/queries/profile"
import { holeOffenenAngebotsEntwurf, holeOffenenNachfassEntwurf } from "@/lib/queries/versand"
import { erstelleServerClient } from "@/lib/supabase/server"
import { formatZeitpunkt } from "@/lib/format"
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
async function aktualisiereMatchStatus(matchId: string, status: "verworfen"): Promise<void> {
  const supabase = await erstelleServerClient()
  const { data, error } = await supabase.from("matches").update({ status }).eq("id", matchId).select("id").maybeSingle()
  if (error) throw error
  if (!data) throw new Error("Match konnte nicht aktualisiert werden")
}

export async function matchSenden(matchId: string): Promise<{ entwurfId: string }> {
  await holeEigenesProfil()

  // Ruling R2: der Dedup-Check läuft als Erstes, noch vor jedem DB-/KI-Zugriff für neue
  // Inhalte -- ein Doppelklick oder ein zweiter Tab bekommt dieselbe id zurück statt
  // eines zweiten, teuren KI-Aufrufs und eines zweiten Angebotsentwurfs.
  const bestehenderEntwurf = await holeOffenenAngebotsEntwurf(matchId)
  if (bestehenderEntwurf) return { entwurfId: bestehenderEntwurf.id }

  const supabase = await erstelleServerClient()
  const { data: matchRow, error } = await supabase.from("matches").select("*").eq("id", matchId).single()
  if (error) throw error
  // Guard "bereits bearbeitet" erst NACH dem Dedup-Check oben: ein Match mit offenem
  // Entwurf hat noch status='neu' (matchSenden setzt den Status seit Task 5 nicht mehr),
  // ein Match ohne Entwurf, aber status != 'neu', wurde anderweitig abgeschlossen.
  if (matchRow.status !== "neu") throw new Error("Dieses Match wurde bereits bearbeitet.")

  const [anfrageRow, objektRow] = await Promise.all([holeAnfrage(matchRow.anfrage_id), holeObjekt(matchRow.objekt_id)])
  if (!anfrageRow || !objektRow) throw new Error("Anfrage oder Objekt nicht gefunden")

  // Empfänger vor dem KI-Aufruf prüfen (Lücke Empfänger): nie ein teurer Gemini-Aufruf,
  // wenn am Ende sowieso kein Postfach erreichbar wäre.
  const empfaenger = await empfaengerFuerAnfrage(anfrageRow.firma_id)

  const anfrage = zuAnfrageDomain(anfrageRow)
  const objekt = zuObjektDomain(objektRow)
  // angeboten_am bei 'neu': früher abgesagt, nach "wieder verfügbar" erneut anbietbar (I5).
  const frueher = matchRow.angeboten_am ? formatZeitpunkt(new Date(matchRow.angeboten_am)) : null
  const entwurf = await entwurfAngebot(anfrage, objekt, matchRow.kriterien as Kriterium[], matchRow.hinweis, frueher)
  const betreff = await betreffFuerAnfrage(anfrage.id, entwurf.betreff)

  const neu = await legeNachrichtAn({
    richtung: "entwurf",
    typ: "angebot",
    anfrage_id: anfrage.id,
    match_id: matchId,
    von: process.env.GMAIL_USER ?? "",
    an: empfaenger,
    betreff,
    body: entwurf.body,
  })

  // Status bleibt 'neu' -- ein Treffer gilt erst mit dem tatsächlichen Versand (siehe
  // entwurf-senden.ts, markiereMatchAngeboten) als angeboten, nicht schon mit dem Entwurf.
  revalidatePath("/admin")
  revalidatePath("/admin/postfach")
  revalidatePath("/admin/entwuerfe")
  revalidatePath("/admin", "layout")
  return { entwurfId: neu.id }
}

export async function matchVerwerfen(matchId: string): Promise<void> {
  await holeEigenesProfil()
  // Offenen Angebots-Entwurf zuerst wegräumen: er bliebe sonst sendbar und böte ein
  // verworfenes Objekt an. Scheitert danach das Verwerfen, ist der Treffer neu entwerfbar.
  await loescheOffenenAngebotsEntwurf(matchId)
  await aktualisiereMatchStatus(matchId, "verworfen")
  revalidatePath("/admin")
}

export async function anfrageNachfragen(anfrageId: string): Promise<{ entwurfId: string }> {
  await holeEigenesProfil()

  // Lücke Nachfass: existiert bereits ein offener Nachfass-Entwurf zur Anfrage, wird
  // dessen id zurückgegeben statt eines zweiten KI-Aufrufs/-Entwurfs.
  const bestehenderEntwurf = await holeOffenenNachfassEntwurf(anfrageId)
  if (bestehenderEntwurf) return { entwurfId: bestehenderEntwurf.id }

  const anfrageRow = await holeAnfrage(anfrageId)
  if (!anfrageRow) throw new Error("Anfrage nicht gefunden")

  // Empfänger vor dem KI-Aufruf prüfen (Lücke Empfänger, wie in matchSenden).
  const empfaenger = await empfaengerFuerAnfrage(anfrageRow.firma_id)

  const anfrage = zuAnfrageDomain(anfrageRow)
  const tage = Math.floor((Date.now() - anfrage.letzterKontakt.getTime()) / 86_400_000)
  const entwurf = await entwurfNachfass(anfrage, tage)
  const betreff = await betreffFuerAnfrage(anfrage.id, entwurf.betreff)

  const neu = await legeNachrichtAn({
    richtung: "entwurf",
    typ: "nachfass",
    anfrage_id: anfrage.id,
    von: process.env.GMAIL_USER ?? "",
    an: empfaenger,
    betreff,
    body: entwurf.body,
  })

  revalidatePath("/admin")
  revalidatePath("/admin/postfach")
  revalidatePath("/admin/entwuerfe")
  revalidatePath("/admin", "layout")
  return { entwurfId: neu.id }
}
