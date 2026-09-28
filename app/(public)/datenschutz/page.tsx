// Grundtext – von Davide zu prüfen und zu ergänzen
import type { Metadata } from "next"
import { Textseite } from "@/components/public/inhalt/Textseite"
import { Platzhalter } from "@/components/public/inhalt/Platzhalter"
import { IMMOHEART_MAIL } from "@/lib/mailto"

export const metadata: Metadata = {
  title: "Datenschutz",
  description: "Wie immoheart personenbezogene Daten bearbeitet: welche Daten, zu welchem Zweck, mit welchen Auftragsverarbeitern.",
}

export default function DatenschutzPage() {
  return (
    <Textseite titel="Datenschutz">
      <h2>Verantwortliche Stelle</h2>
      <p>
        <Platzhalter>[Name / Firma]</Platzhalter>, <Platzhalter>[Strasse Nr., PLZ Ort]</Platzhalter> – ein
        Angebot von espaceSOLOTHURN. Kontakt: <a href={`mailto:${IMMOHEART_MAIL}`}>{IMMOHEART_MAIL}</a>.
      </p>

      <h2>Welche Daten wir bearbeiten</h2>
      <p>
        Angaben aus unseren Formularen (z. B. Suchauftrag, Objektanfrage), E-Mails inklusive Anhängen (z. B.
        Fotos bei einem Inserat) sowie technische Server-Logs (z. B. Zeitpunkt, aufgerufene Seite).
      </p>

      <h2>Zweck der Bearbeitung</h2>
      <p>
        Wir bearbeiten diese Daten, um Ihre Anfrage oder Ihren Suchauftrag zu bearbeiten, Objekte zu
        vermitteln und die Website technisch zu betreiben. Es findet kein Newsletter-Versand und kein
        Tracking oder Analytics statt.
      </p>

      <h2>Empfänger und Auftragsverarbeiter</h2>
      <p>Zur Bearbeitung setzen wir folgende Dienstleister ein:</p>
      <ul>
        <li>Vercel – Hosting der Website.</li>
        <li>Supabase – Datenbank und Dateispeicher (z. B. Objektfotos).</li>
        <li>
          Google – Versand und Empfang von E-Mails über Gmail sowie Gemini-KI zur Vorklassifizierung
          eingehender E-Mails und zum Entwerfen von Antworten; ein Entwurf wird erst nach manueller Prüfung
          durch uns versendet. Auf Objekt-Detailseiten binden wir zudem eine Google-Maps-Karte ein, die nur
          den Ortsnamen anzeigt.
        </li>
      </ul>
      <p>
        Diese Dienstleister können Daten auch ausserhalb der Schweiz bearbeiten (z. B. in der EU oder den
        USA).
      </p>

      <h2>Cookies</h2>
      <p>
        Wir setzen nur technisch notwendige Cookies ein: die Login-Sitzung für Mitarbeitende sowie die
        Theme-Einstellung (<code>immoheart-theme</code>, hell/dunkel). Beide dienen ausschliesslich dem
        Betrieb der Website.
      </p>

      <h2>IP-Adressen und Formular-Schutz</h2>
      <p>
        Um Formulare vor Missbrauch zu schützen (Limit pro Stunde), speichern wir Ihre IP-Adresse nicht im
        Klartext, sondern nur als gesalzenen Hashwert. Aus diesem Hash lässt sich Ihre IP-Adresse praktisch
        nicht zurückrechnen.
      </p>

      <h2>Speicherdauer</h2>
      <p>
        Wir bewahren Ihre Daten so lange auf, wie es für die Bearbeitung Ihrer Anfrage und eine allfällige
        Vermittlung nötig ist, danach löschen wir sie.
      </p>

      <h2>Ihre Rechte</h2>
      <p>
        Sie haben das Recht auf Auskunft, Berichtigung, Löschung und Einschränkung der Bearbeitung Ihrer
        Daten sowie das Recht, einer Bearbeitung zu widersprechen. Wenden Sie sich dazu an{" "}
        <a href={`mailto:${IMMOHEART_MAIL}`}>{IMMOHEART_MAIL}</a>.
      </p>
    </Textseite>
  )
}
