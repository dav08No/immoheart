"use server"

// Öffentliche Action ohne Login-Prüfung (für anonyme Website-Besucher) -- ihr Schutz
// (Honeypot, Mindestzeit, IP-Limit, zod) liegt im gemeinsamen Ablauf
// lib/website-speichern.ts. Es entsteht nur ein Eingang + Antwort-Entwurf, nie eine Mail.
import { suchauftragEntwurf, suchauftragNachricht, suchauftragSchema } from "@/lib/suchauftrag"
import type { ObjektAnfrageErgebnis } from "@/lib/objektanfrage-ergebnis"
import { ohneVorbereitung, speichereWebsiteEintrag } from "@/lib/website-speichern"

export async function suchauftragSenden(eingabe: unknown): Promise<ObjektAnfrageErgebnis> {
  return speichereWebsiteEintrag({
    eingabe,
    schema: suchauftragSchema,
    protokoll: "suchauftragSenden",
    vorbereiten: ohneVorbereitung,
    baueEingang: (daten, _kontext, an) => suchauftragNachricht(daten, an),
    baueEntwurf: (daten, _kontext, an) => {
      const entwurf = suchauftragEntwurf(daten)
      return {
        kategorie: "suchanfrage",
        quelle: "website",
        an: daten.email,
        von: an,
        betreff: entwurf.betreff,
        body: entwurf.body,
      }
    },
  })
}
