"use server"

// Öffentliche Action ohne Login-Prüfung (für anonyme Website-Besucher) -- ihr Schutz
// (Honeypot, Mindestzeit, IP-Limit, zod) liegt im gemeinsamen Ablauf
// lib/website-speichern.ts; hier nur das Auflösen des Objekts ausschliesslich über
// die öffentliche View (siehe Konstraint N5).
import { erstelleZeitToken } from "@/lib/formular-schutz"
import { formularGeheimnis } from "@/lib/formular-geheimnis"
import { objektanfrageEntwurf, objektanfrageNachricht, objektanfrageSchema } from "@/lib/website-eintrag"
import type { ObjektAnfrageErgebnis } from "@/lib/objektanfrage-ergebnis"
import { holeOeffentlichesObjekt } from "@/lib/queries/oeffentlich"
import { speichereWebsiteEintrag } from "@/lib/website-speichern"

export async function zeitTokenHolen(): Promise<string> {
  return erstelleZeitToken(Date.now(), formularGeheimnis())
}

export async function objektAnfragen(eingabe: unknown): Promise<ObjektAnfrageErgebnis> {
  return speichereWebsiteEintrag({
    eingabe,
    schema: objektanfrageSchema,
    protokoll: "objektAnfragen",
    // Nur über die öffentliche View aufgelöst -- ein unveröffentlichtes/verstecktes
    // Objekt darf über eine erratene ID nicht anfragbar sein.
    vorbereiten: async (daten) => {
      const objekt = await holeOeffentlichesObjekt(daten.objektId)
      return objekt
        ? { ok: true, kontext: objekt.titel }
        : { ok: false, ergebnis: { ok: false, fehler: "Dieses Objekt ist nicht mehr verfügbar." } }
    },
    baueEingang: (daten, titel, an) => objektanfrageNachricht(daten, titel, an),
    baueEntwurf: (daten, titel, an) => {
      const entwurf = objektanfrageEntwurf(daten, titel)
      return {
        kategorie: "objektanfrage",
        quelle: "website",
        an: daten.email,
        von: an,
        betreff: entwurf.betreff,
        body: entwurf.body,
        objekt_id: daten.objektId,
      }
    },
  })
}
