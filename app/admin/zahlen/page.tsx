import { Header } from "@/components/layout/Header"
import { ChartKarte } from "@/components/zahlen/ChartKarte"
import { Kachel } from "@/components/zahlen/Kachel"
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
  const groessen = z.groessen.map((g) => ({ label: g.bereich === "unbekannt" ? "unbekannt" : `${g.bereich} m²`, anzahl: g.anzahl }))
  const nutzung = z.nutzung.map((n) => ({ label: n.label, anzahl: n.anzahl }))
  const top = z.topObjekte.map((t) => ({ label: t.titel, anzahl: t.anzahl }))

  return (
    <>
      <Header titel="Zahlen" untertitel="Kacheln: gesamter Bestand · Diagramme: Zeitraum jeweils in der Beschreibung" />
      <main className="flex-1 overflow-y-auto p-4 sm:p-5">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Kachel
            label="Anfragen gesamt"
            wert={anfragen.gesamt > 0 ? formatZahl(anfragen.gesamt) : null}
            zusatz={`${formatZahl(anfragen.offen)} offen`}
          />
          <Kachel
            label="Vermittlungsquote"
            wert={anfragen.quote !== null ? formatProzent(anfragen.quote) : null}
            zusatz={`${formatZahl(anfragen.vermittelt)} von ${formatZahl(anfragen.gesamt)} vermittelt`}
          />
          <Kachel
            label="Tage bis Erstangebot (Median)"
            wert={erstangebot.median !== null ? `${formatTage(erstangebot.median)} Tage` : null}
            zusatz={`aus ${formatZahl(erstangebot.anzahl)} ${erstangebot.anzahl === 1 ? "Anfrage" : "Anfragen"}`}
          />
          <SpeicherKachel buckets={speicher} />
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3.5 lg:grid-cols-2">
          <ChartKarte
            titel="Anfragen pro Monat"
            beschreibung="Neue Anfragen der letzten 12 Monate, nach Quelle gestapelt."
            leer={istLeer(z.proMonat, ["mail", "website", "manuell"])}
            tabelle={{ spalten: ["Monat", "Mail", "Website", "Manuell"], zeilen: z.proMonat.map((m) => [m.label, m.mail, m.website, m.manuell]) }}
          >
            <AnfragenMonatChart daten={z.proMonat} />
          </ChartKarte>
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
          <ChartKarte
            titel="Gefragteste Objekte"
            beschreibung="Die fünf Objekte mit den meisten Objektanfragen im Postfach."
            leer={istLeer(top, ["anzahl"])}
            tabelle={{ spalten: ["Objekt", "Direktanfragen"], zeilen: top.map((t) => [t.label, t.anzahl]) }}
          >
            <BalkenChart daten={top} liegend />
          </ChartKarte>
          <ChartKarte
            titel="Gesuchte Grössen"
            beschreibung="Offene Anfragen nach gesuchter Fläche (Mitte von min/max)."
            leer={istLeer(groessen, ["anzahl"])}
            tabelle={{ spalten: ["Fläche", "Anfragen"], zeilen: groessen.map((g) => [g.label, g.anzahl]) }}
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
      </main>
    </>
  )
}
