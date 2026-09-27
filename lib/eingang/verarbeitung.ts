import "server-only"
import { ordneEin, type Einordnung, type Kategorie } from "@/lib/ki/einordnung"
import { entwurfAntwort, entwurfObjektangebot, entwurfRueckfrage, type Mailentwurf } from "@/lib/ki/entwuerfe"
import { antwortBetreff } from "@/lib/mail/verlauf"
import { legeNachrichtAn, type NachrichtRow } from "@/lib/queries/nachrichten"
import { aktualisiereAnfrage, holeAnfrage } from "@/lib/queries/anfragen"
import {
  hatBildAnhang,
  hatOffenenEntwurfZu,
  holeGesendeteMitAnfrage,
  holeOffeneAnfragenNachAbsender,
  setzeKiFehler,
  setzeKiFertig,
  speichereKiErgebnis,
} from "@/lib/queries/verarbeitung"
import { anfrageKurz, findeAnfrageFuerAntwort, referenzenAeltesteZuerst } from "./zuordnung"
import { kiFehlerText } from "./ki-fehler"

type EntwurfTyp = "rueckfrage" | "antwort"

// Nichts wird gesendet: nur ein Entwurf, und pro Eingang höchstens einer, damit
// "erneut verarbeiten" keine Duplikate stapelt.
async function legeEntwurfAn(
  eingang: NachrichtRow,
  typ: EntwurfTyp,
  anfrageId: string | null,
  erzeuge: () => Promise<Mailentwurf>
): Promise<void> {
  if (!eingang.von.includes("@")) return
  if (await hatOffenenEntwurfZu(eingang.id)) return
  const entwurf = await erzeuge()
  await legeNachrichtAn({
    richtung: "entwurf",
    typ,
    anfrage_id: anfrageId,
    antwort_auf: eingang.id,
    von: process.env.GMAIL_USER ?? "",
    an: eingang.von,
    betreff: antwortBetreff(eingang.betreff),
    body: entwurf.body,
  })
}

async function verarbeiteSuchanfrage(eingang: NachrichtRow, e: Einordnung): Promise<void> {
  await speichereKiErgebnis(eingang.id, { kategorie: "suchanfrage", erkannte_felder: e.felder })
  if (!Object.values(e.felder).some((wert) => wert === null)) return
  await legeEntwurfAn(eingang, "rueckfrage", null, () => entwurfRueckfrage(e.felder))
}

// Vorrang: Verlauf (eindeutiger Beleg) vor manueller Zuordnung vor blosser Absenderadresse.
async function anfrageFuerAntwort(eingang: NachrichtRow, verlaufId: string | null): Promise<string | null> {
  if (verlaufId) return verlaufId
  if (eingang.anfrage_id) return eingang.anfrage_id
  const perAbsender = findeAnfrageFuerAntwort({
    referenzen: [],
    gesendete: [],
    absender: eingang.von,
    offeneNachAbsender: await holeOffeneAnfragenNachAbsender(),
  })
  return perAbsender?.anfrageId ?? null
}

async function verarbeiteAntwort(eingang: NachrichtRow, e: Einordnung, verlaufId: string | null): Promise<void> {
  const anfrageId = await anfrageFuerAntwort(eingang, verlaufId)
  await speichereKiErgebnis(eingang.id, { kategorie: "antwort", erkannte_felder: e.felder, anfrage_id: anfrageId })
  if (!anfrageId) return
  await aktualisiereAnfrage(anfrageId, { letzter_kontakt: new Date().toISOString() })
  const anfrage = await holeAnfrage(anfrageId)
  await legeEntwurfAn(eingang, "antwort", anfrageId, () =>
    entwurfAntwort({ eingangBetreff: eingang.betreff, eingangText: eingang.body, anfrageKurz: anfrageKurz(anfrage) })
  )
}

async function verarbeiteObjektangebot(eingang: NachrichtRow, e: Einordnung): Promise<void> {
  await speichereKiErgebnis(eingang.id, { kategorie: "objektangebot", erkannte_felder: { objekt: e.objekt } })
  const hatBilder = await hatBildAnhang(eingang.id)
  await legeEntwurfAn(eingang, "antwort", null, () =>
    entwurfObjektangebot({ betreff: eingang.betreff, text: eingang.body, hatBilder })
  )
}

async function verarbeiteIntern(eingang: NachrichtRow, erzwungeneKategorie?: Kategorie): Promise<void> {
  // Vorab, damit die Wahl der Nutzerin auch bei einem KI-Fehler sichtbar bleibt.
  if (erzwungeneKategorie) await speichereKiErgebnis(eingang.id, { kategorie: erzwungeneKategorie })
  const referenzen = referenzenAeltesteZuerst(eingang.in_reply_to, eingang.referenzen)
  const verlauf = findeAnfrageFuerAntwort({
    referenzen,
    gesendete: await holeGesendeteMitAnfrage(referenzen),
    absender: eingang.von,
    offeneNachAbsender: {},
  })
  // Einordnung läuft auch bei festem Ergebnis: die Felder braucht es trotzdem.
  const einordnung = await ordneEin(eingang.betreff, eingang.body)
  const kategorie = erzwungeneKategorie ?? (verlauf ? "antwort" : einordnung.kategorie)

  if (kategorie === "suchanfrage") await verarbeiteSuchanfrage(eingang, einordnung)
  else if (kategorie === "antwort") await verarbeiteAntwort(eingang, einordnung, verlauf?.anfrageId ?? null)
  else if (kategorie === "objektangebot") await verarbeiteObjektangebot(eingang, einordnung)
  else await speichereKiErgebnis(eingang.id, { kategorie: "sonstiges", erkannte_felder: null })
  await setzeKiFertig(eingang.id)
}

// Fehler werfen nicht weiter: die Mail bleibt mit ki_status 'fehler' im Postfach
// stehen und kann dort erneut verarbeitet werden.
export async function verarbeite(nachricht: NachrichtRow, erzwungeneKategorie?: Kategorie): Promise<void> {
  try {
    await verarbeiteIntern(nachricht, erzwungeneKategorie)
  } catch (fehler) {
    console.error("verarbeite fehlgeschlagen", nachricht.id, fehler)
    await setzeKiFehler(nachricht.id, kiFehlerText(fehler))
  }
}
