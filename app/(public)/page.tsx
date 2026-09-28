import type { Metadata } from "next"
import { holeStartDaten } from "@/lib/queries/oeffentlich"
import { Hero } from "@/components/public/start/Hero"
import { Kennzahlen } from "@/components/public/start/Kennzahlen"
import { SoFunktionierts } from "@/components/public/start/SoFunktionierts"
import { Highlights } from "@/components/public/start/Highlights"
import { Warum } from "@/components/public/start/Warum"
import { Kontakt } from "@/components/public/start/Kontakt"

const TITEL = "immoheart · Gewerbeflächen mit Herzschlag"
const BESCHREIBUNG =
  "Büro-, Gewerbe-, Produktions- und Lagerflächen in der Region Solothurn – persönlich vermittelt. Objekte ansehen, Suchauftrag erteilen oder Objekt inserieren."

// absolute: sonst hängt das Root-Template ein zweites "· immoheart" an.
export const metadata: Metadata = {
  title: { absolute: TITEL },
  description: BESCHREIBUNG,
  openGraph: { title: TITEL, description: BESCHREIBUNG, type: "website", locale: "de_CH", siteName: "immoheart" },
}

const MAX_HIGHLIGHTS = 3

export default async function StartSeite() {
  const { kennzahlen, highlights } = await holeStartDaten(MAX_HIGHLIGHTS)

  return (
    <>
      <Hero />
      {/* "0 verfügbare Objekte" wirbt nicht -- ohne Bestand (oder bei DB-Fehler) keine Zahlen. */}
      {kennzahlen && kennzahlen.objekte > 0 && <Kennzahlen kennzahlen={kennzahlen} />}
      <SoFunktionierts />
      <Highlights objekte={highlights} />
      <Warum />
      <Kontakt />
    </>
  )
}
