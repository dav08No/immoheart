import { Seitenkopf, SEITEN_INHALT_KLASSE } from "@/components/layout/Seitenkopf"
import { Abschnittstitel } from "@/components/ui/Abschnittstitel"
import { Kennzahl } from "@/components/ui/Kennzahl"
import { ChartKarte } from "@/components/zahlen/ChartKarte"
import { SpeicherKachel } from "@/components/zahlen/SpeicherKachel"
import { AnfragenMonatChart } from "@/components/zahlen/AnfragenMonatChart"
import { MailsWocheChart } from "@/components/zahlen/MailsWocheChart"
import { EntwuerfeChart } from "@/components/zahlen/EntwuerfeChart"
import { BalkenChart } from "@/components/zahlen/BalkenChart"
import { PulsBalken } from "@/components/zahlen/PulsBalken"
import { holeEigenesProfil } from "@/lib/queries/profile"
import { holeSpeicher, holeZahlen } from "@/lib/queries/zahlen"
import { formatZahl } from "@/lib/format"
import { formatProzent, formatTage, istLeer } from "@/lib/zahlen/anzeige"

// Kein try/catch: Ladefehler fängt app/admin/error.tsx (Error-Boundary des Segments).
export default async function ZahlenPage() {
  // Explizit vor dem Admin-Client (holeSpeicher umgeht RLS), auch wenn das Layout
  // den Login schon prüft -- die Seite soll nicht vom Layout abhängen.
  await holeEigenesProfil()
  // Ein Stichtag für alle Zeitfenster; gerechnet wird nur hier auf dem Server, die
  // Diagramme bekommen fertige Labels (keine Datumslogik im Client -> hydrationssicher).
  const jetzt = new Date()
  const [z, speicher] = await Promise.all([holeZahlen(jetzt), holeSpeicher()])
  const { anfragen, erstangebot } = z
  // Einheit steht in der Beschreibung: mit "m²" an jeder Klasse überlappten die Achsenbeschriftungen.
  const groessen = z.groessen.map((g) => ({ label: g.bereich === "unbekannt" ? "?" : g.bereich, anzahl: g.anzahl }))
  const nutzung = z.nutzung.map((n) => ({ label: n.label, anzahl: n.anzahl }))
  const top = z.topObjekte.map((t) => ({ label: t.titel, anzahl: t.anzahl }))

  return (
    <>
      <Seitenkopf titel="Zahlen" kontext="Kacheln: gesamter Bestand · Diagramme: Zeitraum jeweils in der Beschreibung" />
      <main className={SEITEN_INHALT_KLASSE}>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Kennzahl
            label="Anfragen gesamt"
            wert={anfragen.gesamt > 0 ? formatZahl(anfragen.gesamt) : null}
            zusatz={`${formatZahl(anfragen.offen)} offen`}
          />
          <Kennzahl
            label="Vermittlungsquote"
            wert={anfragen.quote !== null ? formatProzent(anfragen.quote) : null}
            zusatz={`${formatZahl(anfragen.vermittelt)} von ${formatZahl(anfragen.gesamt)} vermittelt`}
          />
          <Kennzahl
            label="Tage bis Erstangebot (Median)"
            wert={erstangebot.median !== null ? `${formatTage(erstangebot.median)} Tage` : null}
            zusatz={`aus ${formatZahl(erstangebot.anzahl)} ${erstangebot.anzahl === 1 ? "Anfrage" : "Anfragen"}`}
          />
          <SpeicherKachel buckets={speicher} />
        </div>

        {/* Reihenfolge und Gruppierung laut Spec §3: Nachfrage, Kommunikation, Objekte. */}
        <div className="flex flex-col gap-2">
          <Abschnittstitel>Nachfrage</Abschnittstitel>
          <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-2">
            <ChartKarte
              titel="Anfragen pro Monat"
              beschreibung="Neue Anfragen der letzten 12 Monate, nach Quelle gestapelt."
              leer={istLeer(z.proMonat, ["mail", "website", "manuell"])}
              tabelle={{ spalten: ["Monat", "Mail", "Website", "Manuell"], zeilen: z.proMonat.map((m) => [m.label, m.mail, m.website, m.manuell]) }}
            >
              <AnfragenMonatChart daten={z.proMonat} />
            </ChartKarte>
            <ChartKarte
              titel="Gesuchte Grössen"
              beschreibung="Offene Anfragen nach gesuchter Fläche in m² (Mitte von min/max; ? = unbekannt)."
              leer={istLeer(groessen, ["anzahl"])}
              tabelle={{ spalten: ["Fläche (m²)", "Anfragen"], zeilen: groessen.map((g) => [g.label, g.anzahl]) }}
            >
              <BalkenChart daten={groessen} />
            </ChartKarte>
            <ChartKarte
              titel="Gesuchte Nutzungen"
              beschreibung="Offene Anfragen nach gewünschter Nutzungsart."
              leer={istLeer(nutzung, ["anzahl"])}
              tabelle={{ spalten: ["Nutzung", "Anfragen"], zeilen: nutzung.map((n) => [n.label, n.anzahl]) }}
            >
              <BalkenChart daten={nutzung} liegend />
            </ChartKarte>
            <ChartKarte
              titel="Puls der offenen Anfragen"
              beschreibung="Wie frisch der letzte Kontakt ist: gut, nachfassen oder kritisch."
              leer={istLeer([z.puls], ["gut", "warn", "kritisch"])}
              tabelle={{ spalten: ["Stufe", "Anfragen"], zeilen: [["Gut", z.puls.gut], ["Nachfassen", z.puls.warn], ["Kritisch", z.puls.kritisch]] }}
            >
              <PulsBalken puls={z.puls} />
            </ChartKarte>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Abschnittstitel>Kommunikation</Abschnittstitel>
          <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-2">
            <ChartKarte
              titel="Mails pro Woche"
              beschreibung="Eingegangene und gesendete Mails der letzten 12 Kalenderwochen."
              leer={istLeer(z.mails, ["ein", "aus"])}
              tabelle={{ spalten: ["Woche", "Eingang", "Ausgang"], zeilen: z.mails.map((w) => [w.label, w.ein, w.aus]) }}
            >
              <MailsWocheChart daten={z.mails} />
            </ChartKarte>
            <ChartKarte
              titel="Entwürfe"
              beschreibung="Gesendete und verworfene Entwürfe der letzten 6 Monate, nach Versand- bzw. Löschdatum."
              leer={istLeer(z.entwuerfe, ["gesendet", "geloescht"])}
              tabelle={{ spalten: ["Monat", "Gesendet", "Gelöscht"], zeilen: z.entwuerfe.map((m) => [m.label, m.gesendet, m.geloescht]) }}
            >
              <EntwuerfeChart daten={z.entwuerfe} />
            </ChartKarte>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Abschnittstitel>Objekte</Abschnittstitel>
          <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-2">
            <ChartKarte
              titel="Gefragteste Objekte"
              beschreibung="Die fünf Objekte mit den meisten Objektanfragen im Postfach."
              leer={istLeer(top, ["anzahl"])}
              tabelle={{ spalten: ["Objekt", "Direktanfragen"], zeilen: top.map((t) => [t.label, t.anzahl]) }}
            >
              <BalkenChart daten={top} liegend />
            </ChartKarte>
          </div>
        </div>
      </main>
    </>
  )
}
