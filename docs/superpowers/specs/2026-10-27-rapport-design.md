# immoheart Archiv und Jahresrapport — Design

Stand: 2026-10-27. Ein Branch `feature/rapport`.

## Ziel

Es besteht eine Rapportpflicht. Darum geht nichts Rapportrelevantes mehr verloren: Treffer, Objekte und Anfragen werden **archiviert statt gelöscht**. Im Admin erstellt ein Knopf einen **Jahresrapport als eine einzige Excel-Datei** über die letzten 12 Monate, mit visueller Übersicht, echten Excel-Diagrammen, KI-Zusammenfassung und allen Daten.

Vorgaben von Davide (2026-10-27):

- Treffer, Objekte und Anfragen werden archiviert, nicht gelöscht.
- Eine Archiv-Seite im Admin, auch für Nachfragen unter dem Jahr (Variante 2).
- Archivierte Daten können im Archiv endgültig gelöscht werden, mit Bestätigung und Warnung (nicht mehr im Rapport, nicht wiederherstellbar).
- Im Admin ein Knopf „Rapport erstellen“; er erfasst die Daten von genau einem Jahr zurück bis heute.
- Allgemeiner Jahresrapport mit Diagrammen und Daten über alle Treffer, Angebote usw. Er soll visuell sein und aus genau **einer Datei** bestehen. Format nach meiner Empfehlung: Excel.
- Die KI schreibt den Textteil, die Zahlen berechnet die App exakt.
- Die Excel-Datei erzeugt ein einzelnes Python-Skript mit openpyxl, damit echte Excel-Diagramme entstehen.

## 1 · Archiv

### Treffer: Archiv-Tabelle mit Sicherheitsnetz

- Neue Tabelle `treffer_archiv`. Sie enthält eine Kopie des Treffers zum Zeitpunkt des Entfernens: `match_id`, `anfrage_id`, `objekt_id`, `status`, `score`, `kriterien`, `hinweis`, `angeboten_am`, `reserviert_am`, `abgeschlossen_am`, `treffer_erstellt_am`, dazu `archiviert_am` und `grund`.
- Ein `before delete`-Trigger auf `matches` schreibt **jede** Löschung dorthin, auch künftige und kaskadierende. Ein Treffer kann damit nicht mehr verloren gehen.
- Der Grund stammt aus der transaktionslokalen Einstellung `immoheart.archiv_grund`. Fehlt sie, steht „unbekannt“.
- Gründe:
  - „Objekt reserviert“, „Objekt vermietet“, „Objekt nicht mehr verfügbar“
  - „Anfrage vermittelt“, „Anfrage ruhend“
  - „passt nicht mehr“ und „Objekt nicht verfügbar“ (beides beim Rematching)
  - „Objekt archiviert“, „Anfrage archiviert“
- Die Übergangsfunktionen (Abschluss B) setzen den Grund vor ihrem `delete`, per `create or replace` mit gleichem Verhalten.
- Löschungen aus der App (Rematching in `lib/queries/matches.ts`, manueller Status in `lib/queries/angebote.ts`) laufen über eine neue Funktion `treffer_entfernen(p_ids uuid[], p_grund text)`. Diese setzt den Grund und löscht.
- Wird derselbe Treffer später wieder aktiv und erneut entfernt, entsteht ein zweiter Archiveintrag. Die Geschichte bleibt vollständig.
- RLS: Lesen ist mit „aktives konto“ erlaubt, schreiben nur über den Trigger (`security definer`). Ändern und Löschen sind gesperrt, `anon` hat keine Rechte.

### Objekte und Anfragen: Archivieren statt Löschen

- Neue Spalten `archiviert_am timestamptz` und `archiv_grund text` auf `objekte` und `anfragen`.
- **Archivierte Datensätze** sind:
  - unsichtbar in allen Admin-Listen, Zählern, Kennzahlen, im Puls und in der Matches-Seite;
  - von der Treffersuche in beiden Richtungen ausgeschlossen;
  - unsichtbar auf der Website (`objekte_oeffentlich` filtert sie);
  - weiterhin im Rapport und auf der Archiv-Seite.
- **Archivieren** geschieht per Knopf im Objekt- bzw. Anfrage-Panel, mit Bestätigung und optionalem Grund (Freitext). Es läuft atomar über die Funktionen `objekt_archivieren` und `anfrage_archivieren`, beide `security invoker`.
  - **Objekt:** nur möglich, wenn es keine Treffer im Status `gesendet` oder `reserviert` hat. Sonst erscheint die Meldung „Zuerst Angebote abschliessen (z. B. ‚Nicht mehr verfügbar‘)“, damit die Firmen ihre Absagen bekommen. Seine `neu`-Treffer werden archiviert, Grund „Objekt archiviert“.
  - **Anfrage:** nur möglich ohne Treffer im Status `reserviert`. Ihre `gesendet`-Treffer werden `erledigt`, ohne Absage, denn die Firma sucht nicht mehr. Ihre `neu`-Treffer werden archiviert, Grund „Anfrage archiviert“.
- **Wiederherstellen** geschieht auf der Archiv-Seite. `archiviert_am` wird geleert, Status und Daten bleiben wie sie waren. Danach läuft das Rematching, aber nur für ein `verfuegbar`-Objekt bzw. eine `offen`-Anfrage.
- **Echtes Löschen** von Objekten und Anfragen sperrt ein `before delete`-Trigger („Objekte und Anfragen werden archiviert, nicht gelöscht.“).
  - Einzige Ausnahme ist der bestehende Rollback einer Doppelklick-Dublette in `app/actions/nachrichten.ts` (eine Anfrage, die gerade erst angelegt wurde). Er läuft über die Funktion `anfrage_rollback(p_id)`. Diese setzt `immoheart.rollback = '1'` und erlaubt das Löschen nur für eine Anfrage ohne Nachrichten, die jünger als 10 Minuten ist.

### Archiv-Seite `/admin/archiv`

- Navigationspunkt „Archiv“ in der Seitenleiste, unter „Zahlen“.
- Segmentleiste mit Treffer, Objekte und Anfragen. Dazu ein Zeitraum-Filter (12 Monate, Jahr wählbar, alles) und eine Suche nach Firma oder Objekt.
- **Treffer:** Tabelle mit Firma, Objekt, Status beim Archivieren, Score, angeboten am, archiviert am und Grund. Nur lesbar.
- **Objekte und Anfragen:** Tabelle mit den Eckdaten, Status, archiviert am und Grund, dazu der Knopf „Wiederherstellen“ mit Bestätigung.
- Leerzustand, wenn es nichts gibt. Die Seite nutzt die Bausteine aus `components/ui/*` und ist ab 360 px Breite nutzbar.

### Endgültig löschen (Davide, 2026-10-27)

- Auf der Archiv-Seite hat jeder archivierte Eintrag einen gefährlichen Knopf **„Endgültig löschen“**. Das gilt für Treffer-Archiveinträge, Objekte und Anfragen. Nur archivierte Daten lassen sich so löschen, aktive nie.
- Ein Bestätigungsdialog warnt deutlich: „Dieser Eintrag wird endgültig gelöscht. Er wird **nicht mehr in den Jahresrapport einbezogen** und kann **nicht wiederhergestellt** werden.“ Bei Objekten und Anfragen nennt er zusätzlich, was mitgelöscht wird, zum Beispiel „inkl. 3 archivierte Treffer und 4 Fotos“. Der Löschknopf ist erst aktiv, wenn das Kästchen „Ich habe verstanden“ angehakt ist.
- Nur Konten mit `darf_nutzer_anlegen` (Administratoren) sehen und nutzen den Knopf. Das prüfen Server Action und Datenbankfunktion.
- Was die Datenbankfunktionen `archiv_eintrag_loeschen(p_id)`, `objekt_endgueltig_loeschen(p_id)` und `anfrage_endgueltig_loeschen(p_id)` tun:
  - Sie laufen atomar und brechen ab, wenn der Datensatz nicht archiviert ist.
  - **Objekt:**
    - Seine aktiven Treffer werden ohne Archivierung entfernt; dafür setzt die Funktion `immoheart.endgueltig = '1'`, damit der Archiv-Trigger überspringt.
    - Seine `treffer_archiv`-Einträge und `objekt_fotos`-Zeilen werden gelöscht.
    - Verweise in `anfragen.objekt_id` und `nachrichten.objekt_id` werden auf null gesetzt (bestehendes `on delete set null`).
    - Die Fotodateien im Storage-Bucket löscht die App danach. Gelingt das nicht, wird es nur protokolliert.
  - **Anfrage:** Wie beim Objekt mit ihren Treffern und Archiveinträgen. `nachrichten.anfrage_id` wird null. Die Firma bleibt bestehen.
- Der Lösch-Sperr-Trigger auf `objekte` und `anfragen` lässt das nur zu, wenn `immoheart.endgueltig = '1'` gesetzt ist und der Datensatz archiviert ist.
- Wer wann was endgültig gelöscht hat, wird bewusst nicht protokolliert, weil Davide es so will. Der Rapport zeigt auf dem Blatt „Hinweise“ den Satz „Endgültig gelöschte Einträge sind nicht enthalten.“

## 2 · Jahresrapport

### Ablauf

1. Die Seite „Zahlen“ bekommt im Seitenkopf die Hauptaktion **„Jahresrapport erstellen“**. Ein Dialog nennt den Zeitraum, z. B. „27.10.2025 – 27.10.2026 (12 Monate bis heute)“, und den Knopf „Erstellen“.
2. `POST /api/rapport` ist ein Next.js-Route-Handler. Er ist nur mit Sitzung und aktivem Konto erreichbar, sonst kommt 401. `maxDuration` ist 120.
   1. Er lädt alle Daten im Zeitraum, **einschliesslich archivierter** Daten, über `lib/queries/rapport.ts`.
   2. Er berechnet die Kennzahlen und Reihen mit reinen, getesteten Funktionen in `lib/rapport/*`.
   3. Er lässt Gemini die Zusammenfassung schreiben. Gemini bekommt **nur aggregierte Zahlen**, keine Namen, E-Mail-Adressen oder Texte.
   4. Er sendet ein JSON-Modell an die Python-Funktion und gibt deren `.xlsx` als Download zurück. Der Dateiname lautet `immoheart-rapport-2025-10-27-bis-2026-10-27.xlsx`.
3. Scheitert die KI, etwa am Tageslimit, entsteht der Rapport trotzdem. Das Blatt „Zusammenfassung“ zeigt dann „KI-Zusammenfassung nicht verfügbar (Grund)“.
4. Der Rapport wird nicht gespeichert. Er wird bei Bedarf neu erzeugt, die Daten sind ja archiviert.

### Python-Funktion `api/rapport_excel.py`

- Vercel Python Runtime im selben Projekt, mit openpyxl. Versionen sind in `requirements.txt` fest gepinnt.
- Sie greift **nicht** auf die Datenbank zu. Sie formatiert nur das empfangene Modell.
- Sie ist geschützt durch den Header `x-rapport-schluessel`. Verglichen wird per `hmac.compare_digest` mit der Umgebungsvariable `RAPPORT_SCHLUESSEL`. Diese setzt Davide in Vercel für Preview und Production; sie liegt nicht im Repo.
- Sie prüft die Eingabe: Schema, Grössenlimit von 5 MB, nur erwartete Felder. Bei Fehlern antwortet sie mit 400 bzw. 401, ohne Datenteile in der Fehlermeldung.
- Für lokale Entwicklung ist sie als HTTP-Server startbar (`python api/rapport_excel.py --port 8001`). `RAPPORT_EXCEL_URL` zeigt lokal dorthin, auf Vercel auf `/api/rapport_excel`.
- Tests laufen mit pytest: Arbeitsblätter vorhanden, Diagramme vorhanden, Zeilenanzahl stimmt, Ablehnung bei falschem Schlüssel, leere Daten ergeben eine gültige Datei.

### Inhalt der Excel-Datei (eine Datei)

| Blatt | Inhalt |
|---|---|
| **Übersicht** | Querformat A4, druckfertig mit Seitenlayout „auf eine Seite anpassen“. Kopf mit immoheart-Titel in Markenfarben, Zeitraum und Erstellungsdatum. Darunter 6 Kennzahl-Kacheln aus formatierten Zellen: neue Anfragen, neue Objekte, Treffer, gesendete Angebote, Vermittlungen, Vermittlungsquote. Dazu 4 echte Excel-Diagramme: Anfragen pro Monat (gestapelt nach Quelle), Angebote und Vermittlungen pro Monat, Treffer nach Ergebnis, gesuchte Nutzungen. |
| **Zusammenfassung** | KI-Text mit Jahresrückblick, Trends, Auffälligkeiten und Ausblick, gekennzeichnet als „Von KI verfasst auf Basis der Kennzahlen – bitte prüfen“. Dazu Tage bis Erstangebot und Tage bis Abschluss (Median). |
| **Vermittlungen** | Datum, Firma, Objekt, Fläche, Preis/m², Tage bis Abschluss |
| **Angebote** | Datum gesendet, Firma, Objekt, Ergebnis (angeboten, reserviert, vermittelt, abgelehnt, erledigt, archiviert) |
| **Treffer** | Aktive und archivierte Treffer im Zeitraum: Firma, Objekt, Score, Status, erstellt, archiviert am, Grund |
| **Anfragen** | Eingang, Firma, Nutzung, Fläche, Ort, Budget, Quelle, Status, archiviert |
| **Objekte** | Erfasst, Titel, Ort, Fläche, Preis/m², Nutzung, Status, Anzahl Angebote, archiviert |
| **Hinweise** | Datenquelle, Zeitraum und Definition jeder Kennzahl, damit die Zahlen nachvollziehbar sind |

- Datenblätter als formatierte Excel-Tabellen mit Filter und Kopfzeile, eingefrorener erster Zeile und passenden Spaltenbreiten.
- Farben über die Markenpalette (Petrol und Navy, Akzent Koralle) mit guter Lesbarkeit beim Druck.
- Datenschutz: keine E-Mail-Adressen, keine Eigentümer-Kontakte, keine Mailtexte, nur Firmen- und Objektnamen.

### Zeitraum-Regeln

- Der Zeitraum geht von heute minus 1 Jahr bis heute, beide Tage eingeschlossen, in Schweizer Zeit.
- Ein Ereignis zählt, wenn sein eigenes Datum im Zeitraum liegt:
  - Anfragen nach `created_at`
  - Objekte nach `created_at`
  - Angebote nach `angeboten_am` bzw. `gesendet_am` der Angebotsmail
  - Vermittlungen nach `abgeschlossen_am`
  - Treffer nach Erstellung oder Archivierung im Zeitraum
- Monatsreihen umfassen 13 Monatsbalken (Teilmonate am Rand), beschriftet mit „Okt 25“.

## 3 · Sicherheit und Qualität

- Migrationen sind **nur additiv** (gemeinsame DB). Neue Funktionen nutzen `security invoker`, ausser dem Archiv-Trigger (`security definer`, `search_path` gesetzt). Rechte werden `public` und `anon` entzogen und `authenticated` gewährt. RLS auf `treffer_archiv` mit der Policy „aktives konto“, nur Lesen.
- Der alte Produktionscode muss bis zum Deploy mit dem neuen Schema weiterlaufen. Neue Spalten sind nullable. Den Lösch-Sperr-Trigger für Objekte und Anfragen spiele ich erst **nach** dem Deploy ein (Migration „E2“), weil der alte Rollback-Pfad sonst bricht.
- Kein `any`, Dateien unter 200 Zeilen, Tests für alle reinen Funktionen. Die Python-Funktion hat eigene pytest-Tests.
- Live-Test auf der Preview vor dem Merge, Merge erst nach Davides OK.

## Live-Test

1. Rapport erstellen. Die Datei öffnet sich in Excel und sieht auf A4 gedruckt gut aus. Die Diagramme lassen sich anklicken. Die Zahlen stimmen mit der Seite „Zahlen“ überein.
2. Ein Objekt reservieren. Seine `neu`-Treffer erscheinen im Archiv mit dem Grund „Objekt reserviert“.
3. Ein Test-Objekt archivieren: es verschwindet aus Objekte, Matches und Website und erscheint im Archiv. Danach wiederherstellen.
4. Eine Anfrage archivieren und wiederherstellen.
5. Den Rapport ohne KI erzeugen, indem der Gemini-Fehler simuliert wird.
6. Die Python-Funktion ohne Schlüssel aufrufen. Erwartet: 401.

## Nicht im Umfang

Rapport-Ablage oder -Versand, Protokoll endgültiger Löschungen, mehrere Rapportvorlagen, PDF-Export, Archivierung von Firmen und Nachrichten (diese werden schon weich gelöscht), automatisches Archivieren nach Fristen.
