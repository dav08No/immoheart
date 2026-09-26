# immoheart Relaunch — Design

Datum: 2026-09-26 · Status: zur Freigabe · Vorgänger: `2026-09-22-puls-design.md`

## Zweck und Vorrang

Dieses Dokument beschreibt den Umbau von immoheart von einem reinen internen
Werkzeug zu einer **öffentlichen Website mit Admin-Bereich**, echtem
Mailversand und -empfang über Gmail. Wo es dem README oder der
Vorgänger-Spec widerspricht, **gilt dieses Dokument**. Ausdrücklich
überholt sind:

| Alt (README / Vorgänger-Spec) | Neu |
|---|---|
| „Ein Arbeitswerkzeug, keine Produktwerbung“ | Öffentliche Website mit professionellem, animiertem Auftritt |
| „Kein echter Mailversand“, „keine automatische Mail-Auslese“ (D7, D10) | Echter Versand (SMTP) und Empfang (IMAP) über `immoheart.business@gmail.com` |
| Rollen `admin` / `vermittler` / `leser`, View `anfragen_sichtbar` | Nur noch Konten mit vollen Rechten plus Haken `darf_nutzer_anlegen` |
| Freigabestufen 1–3 | Entfallen. **Jeder Entwurf muss immer von Hand gesendet werden.** |
| Selbstregistrierung `/register` | Entfällt. Konten entstehen nur über die Nutzerverwaltung |
| Regeln (`/regeln`, Tabelle `regeln`) | Entfallen vorerst |
| „Keine Komponentenbibliothek“ | shadcn/ui, lucide-react, motion, three.js/react-three-fiber erlaubt (auf Schwachstellen prüfen) |
| Schrift Cambria | Fraunces (Webschrift) für Titel und Hero |

Unverändert gelten: `lib/matching.ts` (Gewichte, Nutzungs-Gate, Grenze 60)
und `lib/puls.ts` samt Tests, bidirektionales Rematching, „?“ für
Lücken, deutsche Fachbegriffe, kein `any`, Datenzugriff in `lib/queries/`,
schreibende Operationen als Server Actions, Dateien möglichst unter 200
Zeilen.

Die ursprüngliche App ist auf dem Branch `oldversion` gesichert.

## 1 · Aufbau, Routen, Rollen

Eine Next.js-App auf Vercel (`immoheart.vercel.app`). Die Middleware
schützt nur `/admin/*`; ein eingeloggter Nutzer auf `/login` wird nach
`/admin` umgeleitet. Alles andere ist öffentlich.

**Öffentlich**

| Route | Inhalt |
|---|---|
| `/` | Landingpage (Abschnitt 4) |
| `/objekte` | Liste aller öffentlichen Objekte mit Filtern |
| `/objekte/[id]` | Detail, Galerie, Formular „Objekt anfragen“ |
| `/suchauftrag` | Suchauftrag-Formular und Erklärung der Mail-Variante |
| `/inserieren` | Anleitung für Eigentümer (per Mail) |
| `/impressum`, `/datenschutz` | Rechtstexte (Grundtext, von Davide zu prüfen) |
| `/login` | Anmeldung, „Passwort vergessen“ |
| `/passwort-setzen` | Ziel für Einladungs- und Reset-Links |

**Admin** (nur eingeloggt mit aktivem Profil)

| Route | Inhalt |
|---|---|
| `/admin` | Matches mit Bestandspuls |
| `/admin/postfach` | Eingänge, Website-Einträge, Gesendet |
| `/admin/entwuerfe` | Alle offenen Entwürfe |
| `/admin/anfragen` | Anfragen |
| `/admin/objekte` | Objekte inkl. Fotos |
| `/admin/zahlen` | Statistiken |
| `/admin/nutzer` | Nutzerverwaltung (nur mit `darf_nutzer_anlegen`) |

**Konten.** Jedes Konto hat volle Rechte auf Anfragen, Objekte, Postfach,
Entwürfe und Zahlen. Zusätzlich:

- `darf_nutzer_anlegen` (boolean): sieht `/admin/nutzer`, kann Konten
  anlegen, deaktivieren und reaktivieren und setzt dabei den Haken des
  neuen Kontos selbst.
- `aktiv` (boolean): deaktivierte Konten können sich nicht mehr anmelden
  (Auth-Sperre über die Admin-API plus RLS-Prüfung auf `aktiv`).
- Man kann sich nicht selbst deaktivieren. Das letzte aktive Konto mit
  `darf_nutzer_anlegen` kann nicht deaktiviert werden und verliert den
  Haken nicht.
- Start-Konto: `vermittler@immoheart.com` bekommt `darf_nutzer_anlegen =
  true`. `test@immoheart.com` wird gelöscht.
- Die Rechteprüfung liegt serverseitig in den Server Actions, nicht nur in
  der Oberfläche.

**Öffentliche Datenfreigabe.** Anonyme Besucher lesen Objekte nur über
die View `objekte_oeffentlich`: Titel, Ort, Fläche, Preis/m², Nutzung,
Eigenschaften, verfügbar ab, Status, Beschreibung, Fotos. **Keine
Adresse, kein Eigentümer.** Gelistet werden nur Objekte mit `oeffentlich
= true` und Status `verfuegbar` oder `reserviert` (Letzteres mit Badge).

## 2 · Mail

**Anbindung.** Versand per SMTP (`smtp.gmail.com:465`, `nodemailer`),
Empfang per IMAP (`imap.gmail.com:993`, `imapflow` + `mailparser`), beides
mit App-Passwort. Absender `immoheart <immoheart.business@gmail.com>`.
Signatur der KI-Entwürfe: „Freundliche Grüsse / immoheart“.

**Abruf nur bei offenem Admin-Bereich.** Kein Cron. Der Admin-Bereich ruft
alle 2 Minuten eine Server Action `mailAbrufen()` auf, solange der Tab
sichtbar ist (`document.visibilityState === "visible"`), dazu ein Knopf
„Jetzt abrufen“ im Postfach. Die Action prüft den Login. Eine Sperre in
der Tabelle `mail_abruf` (Zeitpunkt des letzten Laufs, atomar gesetzt)
lässt höchstens einen Lauf pro 60 Sekunden zu, auch bei mehreren
offenen Admin-Tabs.

**Ablauf pro Lauf** (höchstens 5 Mails, damit ein Lauf unter der
60-s-Grenze von Vercel Hobby bleibt):

1. Ungelesene Mails aus `INBOX` holen.
2. Rohtext sofort als `nachrichten`-Zeile speichern (`richtung =
   eingang`, `quelle = mail`, `ki_status = offen`). Doppelte werden über
   die eindeutige `message_id` verworfen.
3. Erst danach die Mail in Gmail als gelesen markieren.
4. KI-Verarbeitung aller Zeilen mit `ki_status = offen` (auch
   liegengebliebene aus früheren Läufen). Bei Fehler `ki_status = fehler`
   und `ki_fehler` setzen; Knopf „erneut verarbeiten“ im Postfach.

Anhänge werden nicht gespeichert, nur ihre Dateinamen (`anhaenge`). HTML
wird nie als HTML angezeigt: gespeichert und dargestellt wird der
Textteil, fehlt er, eine aus dem HTML gewonnene Textfassung.

**KI-Einordnung** (`lib/ki/einordnung.ts`, ein Gemini-Aufruf, der
Kategorie und Felder zusammen liefert):

| Kategorie | Reaktion |
|---|---|
| `suchanfrage` | Felder erkennen wie bisher. Bei Lücken Rückfrage-Entwurf. „Als Anfrage speichern“ legt die Firma (Name aus Mail, `kontakt_email` = Absender) an bzw. verknüpft eine bestehende mit gleicher Adresse. |
| `antwort` | Zuordnung zu einer Anfrage: zuerst über `In-Reply-To`/`References` gegen `message_id` unserer gesendeten Mails, sonst über den Absender (`firmen.kontakt_email` einer offenen Anfrage). Dann `letzter_kontakt` aktualisieren, neu genannte Angaben als Vorschlag anzeigen (per Klick übernehmen), Antwort-Entwurf. |
| `objektangebot` | Objektdaten erkennen. „Als Objekt übernehmen“ öffnet das vorausgefüllte Objektformular. Antwort-Entwurf. |
| `sonstiges` | Nur ablegen, kein Entwurf. |

Die Kategorie lässt sich im Postfach von Hand ändern; danach läuft die
passende Reaktion. Ohne gefundene Zuordnung bietet „Anfrage zuordnen“ eine
Auswahl an.

**Website-Einträge.** Die Formulare „Objekt anfragen“ und „Suchauftrag“
erzeugen ebenfalls eine `nachrichten`-Zeile (`quelle = website`,
`kategorie = objektanfrage` bzw. `suchanfrage`) mit bereits strukturierten
Feldern, also ohne KI-Erkennung. Für beide wird ein Antwort-Entwurf
erstellt. Eine Objektanfrage trägt `objekt_id`; „Als Anfrage speichern“
übernimmt die Verknüpfung. **Es geht keine automatische Bestätigung an den
Besucher**; die Seite zeigt nur einen Danke-Zustand.

**Entwürfe.** Nichts verlässt das System ohne Klick. Typen: `rueckfrage`,
`angebot`, `nachfass`, `antwort`, `frei` (von Hand ohne KI).

- Bearbeiten: An, Betreff, Text; speichern oder direkt senden.
- Senden: SMTP-Versand. Ist der Entwurf eine Antwort, werden
  `In-Reply-To` und `References` gesetzt, damit er im selben
  Gmail-Verlauf landet. Nach Erfolg: `richtung = gesendet`,
  `gesendet_am`, `message_id` speichern, `letzter_kontakt` der Anfrage
  aktualisieren. Bei Fehler bleibt der Entwurf mit `versand_fehler`
  liegen.
- Löschen: mit Bestätigung, ohne Grund.

**Systemmails** (Einladung, Passwort vergessen) sind keine Kundenentwürfe
und gehen direkt über Gmail raus. Der Link kommt aus
`auth.admin.generateLink` (serverseitig, Service-Role-Key) und zeigt auf
`/passwort-setzen`. Damit entfallen das Versandlimit und die
Adressprüfung des eingebauten Supabase-Mailversands.

## 3 · Admin-Bereich

- **`/admin` Matches**: Bestandspuls-Hero und Kacheln bleiben. „Angebot
  entwerfen“ legt den Entwurf an und öffnet ihn. „Lange nichts gehört“
  mit „Nachfass entwerfen“.
- **`/admin/postfach`**: Liste mit Filtern Alle / Eingang / Website /
  Gesendet und Kategorie-Chips; Detail mit Originaltext, erkannten Feldern
  („?“ für Lücken) und Aktionen je Kategorie (Als Anfrage speichern, Als
  Objekt übernehmen, Anfrage zuordnen, Kategorie ändern, erneut
  verarbeiten, Antwort entwerfen). Hinweis bei Abruffehler mit Zeitpunkt
  des letzten erfolgreichen Abrufs. Das manuelle „Mail einfügen“
  entfällt.
- **`/admin/entwuerfe`**: alle offenen Entwürfe, gruppiert nach Typ, mit
  Bezug (Anfrage, Objekt, Ursprungsmail). Editor, Speichern, Senden,
  Löschen, „Neue Mail“.
- **`/admin/anfragen`**: wie bisher (Tabelle, Drawer, Inline-Bearbeitung),
  neu mit Mailverlauf, Quelle und verknüpftem Objekt. Das
  Vertraulich-Maskieren entfällt.
- **`/admin/objekte`**: wie bisher, neu mit Foto-Upload (mehrere Bilder,
  Reihenfolge per Drag, erstes = Titelbild), Beschreibung, Schalter „auf
  Website sichtbar“, Zahl der Direktanfragen. Fotos im öffentlichen
  Storage-Bucket `objekt-fotos`; hochladen, ändern und löschen nur
  eingeloggt; nur `image/jpeg|png|webp`, höchstens 5 MB.
- **`/admin/zahlen`**: shadcn-Charts (Recharts). Anfragen pro Monat nach
  Quelle, Vermittlungsquote, Tage bis Erstangebot, Entwürfe gesendet vs.
  gelöscht, Mails ein/aus pro Woche, Top-Objekte nach Direktanfragen,
  gesuchte Grössen und Nutzungsarten, Puls-Verteilung. Keine festen
  Beispielwerte.
- **`/admin/nutzer`**: Liste (Name, E-Mail, Haken, Status eingeladen /
  aktiv / deaktiviert), „Neues Konto“ (Name, E-Mail, Haken) mit
  Einladung, Deaktivieren/Reaktivieren, Einladung erneut senden.
- **Seitenleiste**: Matches, Postfach (Badge ungelesen), Entwürfe (Badge
  offen), Anfragen, Objekte, Zahlen, Nutzer; unten Profil, Passwort
  ändern, Abmelden, Hell/Dunkel, „Zur Website“. Kein Freigabe-Schalter.

Gelöschte Entwürfe werden für die Statistik nicht physisch gelöscht,
sondern mit `geloescht_am` markiert und überall sonst ausgeblendet.

## 4 · Öffentliche Website und Design

**Header**: Logo mit schlagendem Herz, Navigation Objekte / Suchauftrag /
Inserieren / Kontakt, Hell/Dunkel, Knopf „Login“. Beim Scrollen
glasig-transparent.

**`/` Landingpage**

- Hero: grosse Fraunces-Schrift („Gewerbeflächen mit Herzschlag.“),
  wortweise eingeblendet; Knöpfe „Objekte ansehen“ und „Suchauftrag
  erteilen“ mit Pulsring. Rechts das **WebGL-Stadtmodell**
  (react-three-fiber): stilisierte Gewerbebauten in Petrol-Tönen,
  langsam drehend, ein Gebäude pulsiert korallrot im Herzschlag, eine
  EKG-Linie läuft am Boden, leichte Reaktion auf die Maus. Nur auf dieser
  Seite und erst nach dem ersten Rendern nachgeladen. Bei
  `prefers-reduced-motion`, ohne WebGL oder auf schwachen Geräten ein
  statisches Bild.
- Live-Zahlen mit Hochzähl-Animation: verfügbare Objekte, m² total, Orte.
- „So funktioniert's“ in zwei Spuren (Suchende, Eigentümer), je 3
  Schritte; eine EKG-Linie zeichnet sich beim Scrollen.
- Ausgewählte Objekte als Karten mit 3D-Tilt.
- „Warum immoheart“, Kontakt-Block, Footer mit „ein Angebot von
  espaceSOLOTHURN“, Impressum, Datenschutz.

**`/objekte`**: Filter Nutzungsart (mehrfach), Ort (mehrfach), Fläche
von–bis (Slider), Preis/m² max, verfügbar ab, Eigenschaften (aus den
vorhandenen `eigenschaften`-Schlüsseln abgeleitet). Sortierung neu /
Fläche / Preis. Trefferzahl, „Filter zurücksetzen“. Filter stehen in der
URL und werden serverseitig angewendet. Auf dem Handy als Sheet.

**`/objekte/[id]`**: Galerie mit Vollbild, Eckdaten, Beschreibung,
Eigenschaften-Chips, Karte des Orts (Google-Maps-Embed, nur Ortsname),
Badge „reserviert“, Formular „Objekt anfragen“ (Firma, Name, E-Mail,
Telefon optional, Nachricht) mit Danke-Zustand, ähnliche Objekte.

**`/suchauftrag`**: Formular mit Firma, Name, E-Mail, Telefon (optional),
Nutzung, Ort, Fläche von/bis, Budget/m², Bezug, Nachricht. Daneben die
Mail-Variante mit Checkliste, „Adresse kopieren“ und `mailto` mit Vorlage.

**`/inserieren`**: Ablauf für Eigentümer, Checkliste (Adresse, Fläche,
Preis, Nutzung, Verfügbarkeit, Fotos), `mailto` mit Vorlage.

**SEO**: Metadaten je Seite, Open-Graph-Bild für Objekte, `sitemap.xml`,
`robots.txt` (sperrt `/admin`).

**Design-System**

- Farben: Palette bleibt (Petrol `#065A82`, `#1C7293`, Navy `#21295C`,
  Neutrale und Dunkelmodus wie bisher). Neu: Herz-Akzent Korallrot
  (ca. `#E24B5B`, im Dunkelmodus aufgehellt), sparsam für Puls, Herz und
  Live-Punkte; Petrol-zu-Navy-Verläufe für Hero-Flächen.
- Schriften: Outfit (Text), Fraunces (Titel, Zahlen, Hero), beide über
  `next/font`.
- Tailwind v4 (Umstieg von v3), shadcn/ui, lucide-react, motion,
  three/@react-three/fiber/@react-three/drei. Neue Pakete werden mit
  festen Versionen installiert und per `npm audit` geprüft.
- Puls-Effekte: Herz-Logo im Ruhepuls, Pulsringe an Haupt-Knöpfen,
  EKG-Trenner, Live-Punkt bei neuen Objekten, im Admin der Bestandspuls
  und ein kurzer Herzschlag bei neu eingegangenen Mails.
- Alle Animationen respektieren `prefers-reduced-motion`.
- Responsiv bis Handybreite.

## 5 · Daten, Sicherheit, Umsetzung, Tests

**Migrationen** (bestehende Anfragen, Objekte, Firmen bleiben):

- `profiles`: neu `darf_nutzer_anlegen boolean default false`, `aktiv
  boolean default true`; entfernt `rolle`, `freigabe_stufe`, Trigger
  `on_auth_user_created` und `handle_new_user()`, Enum `rolle_enum`.
- Hilfsfunktion `ist_aktives_konto()` (security definer, fester
  `search_path`). RLS auf allen internen Tabellen: lesen und schreiben nur
  `ist_aktives_konto()`. `anon` hat keinen Zugriff auf Basistabellen.
- `objekte`: neu `beschreibung text`, `oeffentlich boolean default true`.
  Neue Tabelle `objekt_fotos` (`objekt_id`, `pfad`, `reihenfolge`). View
  `objekte_oeffentlich` für `anon` und `authenticated`.
- `nachrichten`: neu `message_id text unique`, `in_reply_to text`,
  `quelle` (`mail` | `website`), `kategorie` (`suchanfrage` | `antwort` |
  `objektangebot` | `objektanfrage` | `sonstiges`), `ki_status` (`offen` |
  `fertig` | `fehler`), `ki_fehler`, `objekt_id`, `anhaenge jsonb`,
  `versand_fehler`, `gelesen boolean`, `geloescht_am`. Enum
  `nachricht_typ_enum` um `antwort` und `frei` ergänzt; `anfrage` bleibt
  der Typ aller Eingänge (die Art steht in `kategorie`).
- `anfragen`: neu `quelle` und `objekt_id` (bei Direktanfrage). Die View
  `anfragen_sichtbar` entfällt; `vertraulich` wird entfernt.
- Neu `formular_limits` (IP-Hash, Zeitfenster, Zähler) und `mail_abruf`
  (einzige Zeile: `laeuft_seit`, `letzter_erfolg`, `letzter_fehler`).
- Entfernt: Tabelle `regeln`.
- Danach `npm run types`.

**Sicherheit**

- Ausgabe nur über React (automatisch maskiert). Kein
  `dangerouslySetInnerHTML` mit Nutzer- oder Mailinhalten. Mail-HTML wird
  nie als HTML dargestellt.
- URL-Parameter der Objektsuche werden mit `zod` gegen feste Werte
  geprüft (Enum, Zahlenbereiche, bekannte Orte); ungültige Werte werden
  ignoriert.
- Datenbankzugriffe nur über den Supabase-Client (parametrisiert).
- `mailto`-Vorlagen mit `encodeURIComponent`; keine Weiterleitung auf
  URLs aus Parametern.
- Formulare: Server Actions mit `zod`, Honeypot-Feld, Mindest-Ausfüllzeit
  (3 s), Limit von 5 Einsendungen pro IP und Stunde (IP nur als
  gesalzener Hash gespeichert). Die Formulare lösen keine Mail an den
  Besucher aus.
- Service-Role-Key, Gemini- und Gmail-Zugang nur serverseitig.
- `mailAbrufen` und alle Admin-Actions prüfen den Login und `aktiv`; die
  Nutzer-Actions zusätzlich `darf_nutzer_anlegen`.

**Umgebungsvariablen** (lokal in `.env.local`, bei Vercel für Production
und Preview):

| Variable | Neu? | Herkunft |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY` | nein | wie `docs/setup-secrets.md` |
| `GMAIL_USER` | ja | `immoheart.business@gmail.com` |
| `GMAIL_APP_PASSWORD` | ja | Google-Konto → 2-Schritt-Verifizierung → [App-Passwörter](https://myaccount.google.com/apppasswords), 16 Zeichen ohne Leerzeichen |

Die Basis-URL für Einladungs- und Reset-Links wird aus dem Request
(`headers()`) abgeleitet, damit Preview und Production jeweils auf sich
selbst verlinken. `docs/setup-secrets.md` wird entsprechend ergänzt.

**Meilensteine.** Jeder auf eigenem Feature-Branch, CI grün, Live-Test auf
dem Vercel-Preview, erst dann Merge auf `main` und Kurzprüfung auf
Production.

| # | Inhalt | Fertig, wenn |
|---|---|---|
| N1 | Tailwind v4, shadcn, Tokens, Fonts; Umzug nach `/admin`; öffentliches Grundgerüst; Konto-Modell, RLS neu, Altlasten entfernt (Freigabe, Register, Regeln, leser, vertraulich), Start-Konto | Öffentliche Seiten ohne Login erreichbar, `/admin` nur mit Login, bestehende Admin-Funktionen laufen weiter |
| N2 | Gmail-SMTP, Nutzerverwaltung, Einladung, Passwort vergessen/ändern, Deaktivieren | Neues Konto per Einladungsmail angelegt und eingeloggt; deaktiviertes Konto kommt nicht mehr rein |
| N3 | Entwürfe-Tab, echter Versand, Antworten im Verlauf | Ein Entwurf wird bearbeitet, gesendet und kommt im Gmail an |
| N4 | Abruf bei offenem Admin, Sperre, KI-Einordnung, neues Postfach, Antwort-Zuordnung | Eine echte Mail wird abgeholt, eingeordnet und erzeugt den passenden Entwurf; eine Antwort wird der Anfrage zugeordnet |
| N5 | Foto-Upload, Beschreibung, Sichtbarkeit; `/objekte` mit Filtern, Detailseite, „Objekt anfragen“ | Besucher filtert, öffnet ein Objekt, fragt an; Eintrag und Entwurf erscheinen im Admin |
| N6 | Landingpage mit 3D-Hero, Suchauftrag, Inserieren, Impressum/Datenschutz, Animationen, SEO | Alle öffentlichen Seiten live, Suchauftrag landet im Postfach |
| N7 | Zahlen mit Charts, Puls-Effekte im Admin, Feinschliff, Handy-Ansicht | Alle Kennzahlen aus echten Daten, keine Seite bricht auf Handybreite |

**Tests**

- Vitest für reine Logik: Matching und Puls (bestehend), Filter-Parsing
  aus der URL, Prompt-Aufbau und Antwort-Parsing der KI-Einordnung,
  Antwort-Zuordnung (Header, Absender-Fallback), Formular-Schutz
  (Honeypot, Mindestzeit, Limit), Rechteregeln der Nutzerverwaltung
  (nicht selbst deaktivieren, letztes Konto mit Haken).
- Live-Tests je Meilenstein im Browser auf dem Vercel-Preview (Chrome-
  Erweiterung): Login, Klickwege, Formulare.
- Echter Mail-Test: die App sendet an `immoheart.business@gmail.com`
  selbst, holt die Mail per IMAP ab und prüft Einordnung und Entwurf.
  Einladungen nur an Adressen, die Davide nennt.
- Preview und Production teilen sich die Datenbank: Testdaten tragen
  „[TEST]“ im Titel oder Betreff und werden nach jedem Test entfernt.

**Fehlerfälle**: Versandfehler → Entwurf bleibt mit Meldung; Abruffehler →
Hinweis im Postfach mit letztem Erfolg; KI-Fehler → Mail bleibt mit
„erneut verarbeiten“; Formularfehler → Eingaben bleiben erhalten, Meldung
am Feld.

## Abnahme

- Ohne Login ist die Website mit Objektliste, Filtern, Detail und
  Formularen nutzbar; `/admin/*` leitet auf `/login` um.
- Öffentlich ist nirgends eine Objektadresse oder ein Eigentümer
  sichtbar, weder in der Seite noch in einer API-Antwort.
- Kein Entwurf wird ohne Klick versendet; es gibt keinen Codepfad, der
  automatisch sendet (ausser Einladung und Passwort-Reset).
- Eine eingehende Mail erscheint bei offenem Admin innerhalb von ca. 2
  Minuten im Postfach, eingeordnet und mit passendem Entwurf; bei
  geschlossenem Admin wird nicht abgerufen.
- Eine Antwort auf eine gesendete Mail landet im selben Gmail-Verlauf und
  wird der richtigen Anfrage zugeordnet.
- Ein Konto mit Haken legt ein Konto an; das neue Konto erhält eine
  Einladung und kann sich danach anmelden. Ohne Haken ist
  `/admin/nutzer` nicht erreichbar, auch nicht per direktem Aufruf der
  Action.
- Ein manipulierter Filter-Link (z. B. mit `<script>`) zeigt keine
  ausgeführten Inhalte und keine Fehlerseite.
- Die bestehenden Abnahmekriterien zu Matching und Puls (README) gelten
  weiter, die Tests laufen grün.
- Kein `any`, CI grün, alle Animationen mit reduzierter Bewegung statisch.

## Nicht im Umfang

Zahlungsabwicklung, Mandantensystem, externe Immobilienplattformen,
native App, Mehrsprachigkeit, Kartenansicht mit allen Objekten,
Speichern von Mail-Anhängen, automatische Bestätigungsmails an Besucher,
Regeln/Ausschlusskriterien.
