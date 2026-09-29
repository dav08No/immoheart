# immoheart Vermittlungs-Abschluss und Prozesslücken — Design

Stand: 2026-09-29. Ein Branch `feature/abschluss`.

## Ziel

Aus einem versendeten Angebot wird ein nachvollziehbarer Abschluss: Objekt zuerst **reserviert**, dann **vermietet**, Anfrage **vermittelt**. Beteiligte (andere Firmen mit Angebot, Eigentümer, Firma) erhalten dazu KI-Entwürfe. Eigentümer-Mails „Fläche nicht mehr verfügbar“ erkennt die KI und bietet die passende Aktion an. Zusätzlich werden die beim Durchgehen des Ablaufs gefundenen Lücken behoben.

Vorgaben von Davide:

- Nach dem Angebot zuerst **reserviert**, mit Hinweis auf die anderen Firmen mit Angebot; die KI entwirft deren Absagen gleich mit.
- Eigentümer bekommt eine E-Mail-Adresse am Objekt und eigene Info-Entwürfe (Option A).
- Eigentümer-Meldungen „nicht mehr verfügbar“ erkennt die KI; die Änderung selbst passiert per Klick (Vorschlag + ein Klick, Option A).
- Weiterhin gilt: **nichts wird automatisch versendet**, jede Mail ist ein Entwurf, den Davide bestätigt.

## 1 · Status und Übergänge

**Treffer (`matches.status`)**: `neu → gesendet → reserviert → vermittelt`; Seitenwege `verworfen` (vor Angebot), `abgelehnt` (Firma will nicht), `erledigt` (Objekt ging an jemand anderen bzw. Anfrage anderweitig vermittelt). `gesendet` bleibt technisch bestehen und heisst in der Oberfläche überall **„Angeboten“**.

**Objekt**: `verfuegbar / reserviert / vermietet` (unverändert). **Anfrage**: `offen / ruhend / vermittelt` (unverändert), neu im Bearbeiten setzbar.

| Aktion | Ort | Wirkung | KI-Entwürfe |
|---|---|---|---|
| Angebot entwerfen | Matches | Treffer bleibt `neu`, bis die Angebotsmail **versendet** ist → `gesendet` + `angeboten_am`. Offener Angebots-Entwurf vorhanden → dieser wird geöffnet statt neu erzeugt. Entwurf gelöscht → Treffer bleibt `neu`. | Angebot |
| Firma lehnt ab | Anfrage-Panel „Angebote“, Postfach-Antwort | Treffer `gesendet → abgelehnt` | – |
| Reservieren | Anfrage-Panel „Angebote“, Objekt-Panel „Interessenten“ | Objekt `verfuegbar → reserviert`; Treffer `gesendet → reserviert` + `reserviert_am`; andere `gesendet`-Treffer desselben Objekts → `erledigt`; dessen `neu`-Treffer werden entfernt | Absage je Firma der erledigten Treffer; Info an Eigentümer (reserviert) |
| Vertrag unterschrieben | dort | Objekt → `vermietet`; Treffer `reserviert → vermittelt` + `abgeschlossen_am`; Anfrage → `vermittelt`; übrige `gesendet`-Treffer der Anfrage → `erledigt`, ihre `neu`-Treffer werden entfernt | Info an Eigentümer (vermietet); Bestätigung an Firma |
| Reservierung aufheben | dort | Objekt → `verfuegbar`; Treffer `reserviert → gesendet`, `reserviert_am` geleert; Rematching für das Objekt; noch **nicht gesendete** Absage-Entwürfe dieses Objekts werden gelöscht (soft); bereits gesendete bleiben | Info an Eigentümer (aufgehoben) |
| Objektmeldung „nicht verfügbar“ bestätigen | Postfach | Objekt → `vermietet`; alle `gesendet`/`reserviert`-Treffer des Objekts → `erledigt`; `neu`-Treffer entfernt | Absage je betroffener Firma (Dank an Eigentümer entsteht schon beim Einlesen) |
| Wieder verfügbar setzen | Postfach (Objektmeldung), Objekt-Panel | Objekt `reserviert`/`vermietet` → `verfuegbar`; ein `reserviert`-Treffer geht zurück auf `gesendet` (wie Aufheben); `vermittelt`-Treffer und vermittelte Anfragen bleiben als Historie unverändert; Rematching | – |

Jede Aktion hat einen Bestätigungsdialog, der die Folgen auflistet (z. B. „2 andere Firmen erhalten einen Absage-Entwurf“).

Ungültige Übergänge (z. B. Reservieren eines nicht angebotenen Treffers, zweites Reservieren desselben Objekts) werden abgelehnt mit einer verständlichen Meldung.

## 2 · Eigentümer, Objektmeldung, KI-Entwürfe

**Eigentümer-E-Mail**: neues optionales Feld `objekte.eigentuemer_email` im Objekt-Formular unter „Eigentümer“. „Als Objekt übernehmen“ setzt den Absender der Eingangsmail. Bestehende Objekte werden einmalig aus ihrer verknüpften Eingangsmail befüllt. Fehlt die Adresse, entsteht kein Eigentümer-Entwurf, sondern der Hinweis „Eigentümer-E-Mail fehlt – keine Info-Mail möglich“ mit Link zum Objekt.

**Kategorie `objektmeldung`**: Die KI-Einordnung unterscheidet Objektangebot (neue Fläche) von Objektmeldung (Änderung an bekannter Fläche) und liefert `aenderung ∈ {nicht_verfuegbar, wieder_verfuegbar, sonstige_aenderung}` plus einen kurzen Satz (`zusammenfassung`).

Zuordnung zum Objekt, in dieser Reihenfolge:

1. Verlauf: Referenzen der Mail zeigen auf eine gesendete Mail mit `objekt_id`.
2. Absender = `eigentuemer_email` genau eines Objekts mit Status verfügbar oder reserviert.
3. Sonst keine Zuordnung; Postfach zeigt „Objekt zuordnen“ (Auswahl).

Postfach-Aktionen je Änderung: „Objekt als vermietet markieren“ / „Wieder verfügbar setzen“ / „Objekt öffnen“. Beim Einlesen entsteht nur der Dank-Entwurf an den Eigentümer; Absagen erst nach dem Klick.

**KI-Entwürfe** (Sie-Form, knapp, Absender immoheart, keine erfundenen Objekte/Preise/Termine):

| Typ (`nachrichten.typ`) | An | Inhalt |
|---|---|---|
| `absage` | Firma | Fläche X nicht mehr verfügbar, wir suchen weiter (Eckdaten der Anfrage); im Verlauf des Angebots (Re:-Betreff, In-Reply-To) |
| `eigentuemer_info` | Eigentümer | reserviert / vermietet über immoheart / Reservierung aufgehoben / Dank für Meldung |
| `bestaetigung` | Firma | Freude über Abschluss, nächste Schritte offen formuliert |
| `antwort` (verbessert) | Firma | Hängt die Antwort an einem Angebot, erhält die KI Objekt und Angebotskontext und antwortet passend (z. B. Besichtigungswunsch aufnehmen, ohne Termin zu erfinden). Die Einordnung liefert zusätzlich `kein_interesse: boolean`; dann bietet das Postfach „Firma lehnt ab“ an. |

**KI-Ausfall**: Statusänderungen werden zuerst gespeichert, Entwürfe danach einzeln erzeugt. Fehlen Entwürfe, zeigen Treffer bzw. Objekt „N Entwürfe fehlen“ mit „Entwürfe erneut erzeugen“; erzeugt werden nur fehlende (Schlüssel: Typ + Empfänger + Treffer/Objekt, keine Duplikate).

## 3 · Oberfläche und weitere Lücken

- **Anfrage-Panel**: neuer Abschnitt „Angebote“ (alle Treffer der Anfrage mit Status ≠ neu/verworfen: Objekt, Status-Chip, Angebotsdatum, Aktionen je Status). „Bester Treffer“ nur aus `neu`/`gesendet`. Status-Auswahl Offen/Ruhend/Vermittelt im Bearbeiten.
- **Anfrage-Status**: `ruhend` → kein Matching, nicht in „Lange nichts gehört“, nicht im Puls; `ruhend/vermittelt → offen` löst Rematching aus. Manuell „vermittelt“ ohne Treffer ist erlaubt und ändert kein Objekt; dabei werden `neu`-Treffer der Anfrage entfernt.
- **Objekt-Panel**: neuer Abschnitt „Interessenten“ (Treffer ≠ neu/verworfen mit Firma, Status, Aktionen). Freies Status-Feld im Formular entfällt; Status nur über die Aktionen; „Wieder verfügbar setzen“ direkt im Panel.
- **Matches**: Kennzahl „Reserviert“; „Lange nichts gehört“ nur offene Anfragen (schon heute), Puls weiterhin nur offene.
- **Postfach**: Filter-Chip „Objektmeldung“; Aktionen wie in §2; „Firma lehnt ab“ bei Antwort mit `kein_interesse`.
- **Entwürfe**: Gruppe „Abschluss“ (absage, eigentuemer_info, bestaetigung).
- **Website**: reservierte Objekte mit Chip „Reserviert“; Objekt-Anfrageformular bleibt nutzbar mit Hinweis „Derzeit reserviert – Sie können trotzdem Interesse anmelden.“
- **Zahlen**: Vermittlungsquote und „Tage bis Erstangebot“ aus echten Daten (`angeboten_am`); neue Kennzahl „Tage bis Abschluss“ (Median `abgeschlossen_am − anfragen.created_at`).
- **Lücke Empfänger**: vor jedem KI-Aufruf für einen Entwurf wird der Empfänger geprüft; ohne Adresse sofort klare Meldung, kein KI-Aufruf.
- **Lücke Nachfass**: offener Nachfass-Entwurf zur Anfrage vorhanden → „Nachfass entwerfen“ öffnet diesen.

## 4 · Daten, Sicherheit, Tests

**Migration** (nur additiv, da Preview und Produktion eine DB teilen):

- `match_status_enum` + `reserviert`, `vermittelt`, `abgelehnt`, `erledigt`; `matches` + `angeboten_am`, `reserviert_am`, `abgeschlossen_am` (timestamptz, nullable).
- `objekte` + `eigentuemer_email text`; Backfill aus `nachrichten` (Eingang mit `objekt_id`, Kategorie objektangebot, ältester).
- `nachricht_kategorie_enum` + `objektmeldung`; `nachricht_typ_enum` + `absage`, `eigentuemer_info`, `bestaetigung`. `nachrichten.objekt_id` existiert bereits (N4) und wird für Entwürfe an Eigentümer/Absagen mitgesetzt.
- Backfill `angeboten_am` aus der ersten gesendeten Nachricht je `match_id`; Treffer `gesendet` ohne gesendete Nachricht und ohne offenen Entwurf → `neu`.

**Übergangsfunktionen** als Postgres-Funktionen (`treffer_reservieren`, `treffer_vermitteln`, `reservierung_aufheben`, `objekt_nicht_verfuegbar`, `objekt_wieder_verfuegbar`, `treffer_ablehnen`): atomar, prüfen den Ausgangsstatus mit Zeilensperre, `security invoker` (RLS „aktives Konto“ greift), `revoke execute … from anon, public`, `grant … to authenticated`. Rückgabe: betroffene Treffer-/Anfrage-IDs für die anschliessende Entwurfserzeugung. Die App ruft sie über Server Actions (`holeEigenesProfil()` vorab).

Der Versand (`entwurfSenden`) setzt nach erfolgreichem `markiereGesendet` best-effort den verknüpften Treffer `neu → gesendet` + `angeboten_am` (wie heute `letzter_kontakt`, ohne den Versand als Fehler zu melden).

**Tests** (Vitest): Übergangsregeln (erlaubt/verboten, pure Funktion spiegelt die DB-Regeln für die UI), Objektmeldung-Zuordnung (Verlauf, Eigentümer-Adresse, mehrdeutig), Prompt-Bau je neuem Entwurf, Einordnung neue Kategorie + `kein_interesse` + `aenderung`, „fehlende Entwürfe“-Berechnung ohne Duplikate, Zahlen (Quote, Median Tage bis Abschluss), Empfänger-Vorprüfung ohne KI-Aufruf, Nachfass-Deduplizierung.

**Live-Test** (Preview, Testdaten, Mails nur an bekannte Testadressen): Angebot senden → zweite Firma bekommt Angebot für dasselbe Objekt → Reservieren (Absage- und Eigentümer-Entwürfe prüfen) → Aufheben → erneut Reservieren → Vertrag unterschrieben → Test-Objektmeldung per Mail an die immoheart-Gmail → erkannt → Klick → Absagen. Danach Testdaten aufräumen (Eingänge soft löschen).

## Nicht im Umfang

Automatischer Versand, Verträge/Dokumente, Besichtigungskalender, mehrere Eigentümer-Kontakte pro Objekt, Teilflächen-Logik (bleibt „sonstige Änderung“ + manuelles Bearbeiten).
