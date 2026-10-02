import "server-only"
import { ordneEin, type Aenderung, type Einordnung, type Kategorie } from "@/lib/ki/einordnung"
import { entwurfAntwort, entwurfObjektangebot, entwurfRueckfrage, type Mailentwurf } from "@/lib/ki/entwuerfe"
import { entwurfEigentuemerInfo } from "@/lib/ki/abschluss-entwuerfe"
import { markerFelder } from "@/lib/abschluss/entwuerfe-plan"
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
  type GesendeteImVerlauf,
} from "@/lib/queries/verarbeitung"
import { holeAktiveObjekteNachEigentuemer, holeAngebotFuerTreffer, holeObjektTitel } from "@/lib/queries/objektmeldung"
import { anfrageKurz, findeAnfrageFuerAntwort, referenzenAeltesteZuerst } from "./zuordnung"
import { findeObjektFuerMeldung, zuordenbareStatus } from "./objekt-zuordnung"
import { kiFehlerText } from "./ki-fehler"
import type { Json } from "@/types/database"

type EntwurfTyp = "rueckfrage" | "antwort" | "eigentuemer_info"
type EntwurfBezug = { anfrageId: string | null; objektId?: string | null; erkannteFelder?: Json }

// Nichts wird gesendet: nur ein Entwurf, und pro Eingang höchstens einer, damit
// "erneut verarbeiten" keine Duplikate stapelt.
async function legeEntwurfAn(
  eingang: NachrichtRow,
  typ: EntwurfTyp,
  bezug: EntwurfBezug,
  erzeuge: () => Promise<Mailentwurf>
): Promise<void> {
  if (!eingang.von.includes("@")) return
  if (await hatOffenenEntwurfZu(eingang.id)) return
  const entwurf = await erzeuge()
  await legeNachrichtAn({
    richtung: "entwurf",
    typ,
    anfrage_id: bezug.anfrageId,
    ...(bezug.objektId !== undefined ? { objekt_id: bezug.objektId } : {}),
    ...(bezug.erkannteFelder !== undefined ? { erkannte_felder: bezug.erkannteFelder } : {}),
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
  await legeEntwurfAn(eingang, "rueckfrage", { anfrageId: null }, () => entwurfRueckfrage(e.felder))
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

// Die jüngste referenzierte gesendete Mail der Anfrage: war sie ein Angebot, antwortet
// die Firma auf genau dieses Objekt.
function angebotsTrefferImVerlauf(referenzen: string[], gesendete: GesendeteImVerlauf[], anfrageId: string): string | null {
  for (let i = referenzen.length - 1; i >= 0; i--) {
    const mail = gesendete.find((g) => g.message_id === referenzen[i] && g.anfrage_id === anfrageId)
    if (mail) return mail.typ === "angebot" ? mail.match_id : null
  }
  return null
}

async function verarbeiteAntwort(eingang: NachrichtRow, e: Einordnung, verlaufId: string | null, matchId: string | null): Promise<void> {
  const anfrageId = await anfrageFuerAntwort(eingang, verlaufId)
  const angebot = matchId ? await holeAngebotFuerTreffer(matchId) : null
  // kein_interesse + match_id nur bei Angebot: daraus bietet das Postfach "Firma lehnt ab".
  const felder: Json = angebot ? { ...e.felder, kein_interesse: e.kein_interesse, match_id: matchId } : e.felder
  await speichereKiErgebnis(eingang.id, { kategorie: "antwort", erkannte_felder: felder, anfrage_id: anfrageId })
  if (!anfrageId) return
  await aktualisiereAnfrage(anfrageId, { letzter_kontakt: new Date().toISOString() })
  const anfrage = await holeAnfrage(anfrageId)
  await legeEntwurfAn(eingang, "antwort", { anfrageId }, () =>
    entwurfAntwort({ eingangBetreff: eingang.betreff, eingangText: eingang.body, anfrageKurz: anfrageKurz(anfrage), angebot })
  )
}

async function verarbeiteObjektangebot(eingang: NachrichtRow, e: Einordnung): Promise<void> {
  await speichereKiErgebnis(eingang.id, { kategorie: "objektangebot", erkannte_felder: { objekt: e.objekt } })
  const hatBilder = await hatBildAnhang(eingang.id)
  await legeEntwurfAn(eingang, "antwort", { anfrageId: null }, () =>
    entwurfObjektangebot({ betreff: eingang.betreff, text: eingang.body, hatBilder })
  )
}

// Vorrang wie bei Antworten: Verlauf vor manueller Zuordnung vor Eigentümer-Adresse.
async function objektFuerMeldung(
  eingang: NachrichtRow,
  referenzen: string[],
  gesendete: GesendeteImVerlauf[],
  aenderung: Aenderung | undefined
): Promise<string | null> {
  const perVerlauf = findeObjektFuerMeldung({ referenzen, gesendete, absender: eingang.von, aktiveNachEigentuemer: {} })
  if (perVerlauf) return perVerlauf.objektId
  if (eingang.objekt_id) return eingang.objekt_id
  const aktive = await holeAktiveObjekteNachEigentuemer(zuordenbareStatus(aenderung))
  return findeObjektFuerMeldung({ referenzen: [], gesendete: [], absender: eingang.von, aktiveNachEigentuemer: aktive })?.objektId ?? null
}

// Beim Einlesen nur der Dank an den Eigentümer; Statuswechsel und Absagen erst per Klick.
async function verarbeiteObjektmeldung(
  eingang: NachrichtRow,
  e: Einordnung,
  referenzen: string[],
  gesendete: GesendeteImVerlauf[]
): Promise<void> {
  const objektId = await objektFuerMeldung(eingang, referenzen, gesendete, e.meldung?.aenderung)
  await speichereKiErgebnis(eingang.id, {
    kategorie: "objektmeldung",
    erkannte_felder: { meldung: e.meldung },
    ...(objektId ? { objekt_id: objektId } : {}),
  })
  const erkannteFelder = markerFelder({ ki_ausstehend: false, anlass: "meldung_dank" })
  await legeEntwurfAn(eingang, "eigentuemer_info", { anfrageId: null, objektId, erkannteFelder }, async () => {
    // Titel erst hier laden: ohne Empfänger/bei offenem Entwurf braucht es ihn nicht.
    const titel = objektId ? await holeObjektTitel(objektId) : null
    return entwurfEigentuemerInfo({
      objektTitel: titel ?? eingang.betreff,
      anlass: "meldung_dank",
      meldung: e.meldung?.zusammenfassung || eingang.body,
    })
  })
}

async function verarbeiteIntern(eingang: NachrichtRow, erzwungeneKategorie?: Kategorie): Promise<void> {
  // Vorab, damit die Wahl der Nutzerin auch bei einem KI-Fehler sichtbar bleibt.
  if (erzwungeneKategorie) await speichereKiErgebnis(eingang.id, { kategorie: erzwungeneKategorie })
  const referenzen = referenzenAeltesteZuerst(eingang.in_reply_to, eingang.referenzen)
  const gesendete = await holeGesendeteMitAnfrage(referenzen)
  const verlauf = findeAnfrageFuerAntwort({
    referenzen,
    gesendete,
    absender: eingang.von,
    offeneNachAbsender: {},
  })
  // Einordnung läuft auch bei festem Ergebnis: die Felder braucht es trotzdem.
  const einordnung = await ordneEin(eingang.betreff, eingang.body)
  const kategorie = erzwungeneKategorie ?? (verlauf ? "antwort" : einordnung.kategorie)

  if (kategorie === "suchanfrage") await verarbeiteSuchanfrage(eingang, einordnung)
  else if (kategorie === "antwort") {
    const matchId = verlauf ? angebotsTrefferImVerlauf(referenzen, gesendete, verlauf.anfrageId) : null
    await verarbeiteAntwort(eingang, einordnung, verlauf?.anfrageId ?? null, matchId)
  } else if (kategorie === "objektangebot") await verarbeiteObjektangebot(eingang, einordnung)
  else if (kategorie === "objektmeldung") await verarbeiteObjektmeldung(eingang, einordnung, referenzen, gesendete)
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
