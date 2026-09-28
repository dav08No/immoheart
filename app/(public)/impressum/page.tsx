// Grundtext – von Davide zu prüfen und zu ergänzen
import type { Metadata } from "next"
import { Textseite } from "@/components/public/inhalt/Textseite"
import { Platzhalter } from "@/components/public/inhalt/Platzhalter"
import { IMMOHEART_MAIL } from "@/lib/mailto"

export const metadata: Metadata = {
  title: "Impressum",
  description: "Impressum von immoheart, ein Angebot von espaceSOLOTHURN.",
}

export default function ImpressumPage() {
  return (
    <Textseite titel="Impressum">
      <h2>Betreiberangaben</h2>
      <p>
        <Platzhalter>[Name / Firma]</Platzhalter>
        <br />
        <Platzhalter>[Strasse Nr., PLZ Ort]</Platzhalter>
        <br />
        UID: <Platzhalter>[UID CHE-…]</Platzhalter>
        <br />
        Verantwortlich: <Platzhalter>[verantwortliche Person]</Platzhalter>
      </p>
      <p>immoheart ist ein Angebot von espaceSOLOTHURN, Region Solothurn.</p>

      <h2>Kontakt</h2>
      <p>
        <a href={`mailto:${IMMOHEART_MAIL}`}>{IMMOHEART_MAIL}</a>
      </p>

      <h2>Haftung</h2>
      <p>
        Wir bemühen uns um korrekte und aktuelle Inhalte, übernehmen dafür aber keine Gewähr. Angaben zu
        einzelnen Objekten (z. B. Fläche, Preis, Verfügbarkeit) stammen von den anbietenden Personen oder
        Unternehmen; für deren Richtigkeit haften wir nicht. Für Inhalte verlinkter, externer Websites sind
        ausschliesslich deren Betreiber verantwortlich.
      </p>

      <h2>Urheberrecht</h2>
      <p>
        Aufbau, Gestaltung und Inhalte dieser Website sind urheberrechtlich geschützt. Eine Übernahme ohne
        unsere vorgängige Zustimmung ist nicht gestattet.
      </p>
    </Textseite>
  )
}
