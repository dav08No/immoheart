# immoheart Admin-Design — Design

Stand: 2026-09-28. Folgeprojekt nach dem Relaunch (N1–N7). Ein Branch `feature/admin-design`.

## Ziel und Vorrang

Alle Admin-Seiten (`/admin/*`) und die Anmelde-Seiten (`/login`, `/passwort-vergessen`, `/passwort-setzen`, `/auth/bestaetigen`) bekommen einen einheitlichen, klar gegliederten Aufbau, der zur öffentlichen Website passt.

**Funktional bleibt alles exakt gleich:** gleiche Knöpfe, Abläufe, Server Actions, Daten, Texte der Abläufe (Meldungen, Bestätigungen). Geändert werden nur Aufbau, Hierarchie, Gestaltung sowie Seitenüberschriften und Kontextzeilen. Keine Datenbank-Änderungen, keine neuen Pakete ohne Not.

Vorgaben von Davide:

- Gesamtüberarbeitung: einheitlich, klare Hierarchie, näher an der Marke.
- „Gleiche Marke, ruhiger“: Farben, Fraunces-Titel und Herz-Akzente wie die Website; keine grossen Hero-Verläufe/3D im Admin (Ausnahme: Seitenleiste und Anmelde-Markenfläche).
- Dunkle Markenleiste (Petrol→Navy-Verlauf) als Navigation, helle ruhige Arbeitsfläche.
- Dichte „luftig, aber effizient“.
- Alle Seiten gleich wichtig; Anmelde-Seiten eingeschlossen.
- Hell/Dunkel und Handy-Ansicht (ab 360 px) bleiben erhalten; reduzierte Bewegung wird respektiert.

## 1 · Grundgerüst

**Seitenleiste** (Desktop fest ≥ `lg`, darunter als Sheet wie heute)

- Hintergrund: Verlauf `--hero-von` → `--hero-bis` (Hell) bzw. tiefer im Dunkelmodus; eigene Tokens `--nav-*` für Text, Hover, Aktiv, Badge, Trennlinie.
- Oben Logo (schlagendes Herz, Schrift hell), darunter klein „Admin“.
- Menüpunkte mit Icon und Text; aktiv: heller Hintergrundbalken, weisse Schrift, 3 px korallroter Strich links; Hover: leicht aufgehellt; Fokusring sichtbar.
- Badges (Postfach ungelesen, Entwürfe offen) als helle Pillen; Herzschlag bei neuen Mails bleibt (N7).
- Unten, durch Trennlinie getrennt: Profil (Initialen-Kreis, Name, Link zum Profil), „Zur Website“, „Abmelden“ (weiterhin POST-Formular).

**Seitenkopf** (einheitlicher Baustein `Seitenkopf` für jede Seite)

- Titel in Fraunces (grösser als heute), darunter eine Kontextzeile (gedämpft) mit echten Zahlen der Seite.
- Rechts: Hauptaktion der Seite (Primärknopf), Theme-Umschalter.
- Sticky, beim Scrollen leicht durchscheinend (`backdrop-blur`), wie der Website-Header.
- Handy: Menü-Knopf (mit Punkt bei ungelesen/offen), kurzer Titel, Hauptaktion als Icon-Knopf mit `aria-label`.

**Arbeitsfläche**

- Hintergrund `--bg`; Inhalte in Panels; Aussenabstand 24 px (Desktop) / 16 px (Handy), 16 px zwischen Panels.
- Maximalbreite (~48rem) für Formular-/Textseiten (Profil, Nutzer-Formular); Listen-/Tabellenseiten volle Breite.

**Anmelde-Seiten**

- Desktop zweigeteilt: links Markenfläche (Verlauf, Herz, „Gewerbeflächen mit Herzschlag.“, eine Zeile Text), rechts das Formular in einem Panel.
- Handy: schmaler Markenstreifen oben, Formular darunter.
- Funktionen, Felder, Meldungen, Weiterleitungen unverändert (inkl. `/auth/bestaetigen` als POST-Formular).

## 2 · Bausteine (`components/admin/ui/*`)

| Baustein | Inhalt |
|---|---|
| `Panel` (+ `PanelKopf`) | Fläche `surface`, feiner Rand, Radius 14 px, sehr leichter Schatten; optionaler Kopf mit Fraunces-Titel, Beschreibung, Aktionen rechts |
| `Abschnittstitel` | kleine gesperrte Grossbuchstaben, gedämpft |
| `Kennzahl` | Label, grosse Zahl (Fraunces), Zusatzzeile, optional Status-Punkt/Balken |
| `ListenZeile` | Icon/Avatar, Titel, Unterzeile, rechts Zeit/Badges; ungelesen fett + Punkt; ausgewählt: korallroter Balken links + heller Hintergrund; Hover |
| `StatusChip` | eine Pillenform für alle Status (Objekt, Anfrage, Kategorie, KI, Quelle); Töne gut/warn/kritisch/info/neutral nur aus Tokens |
| Knöpfe | Varianten primär (Petrol gefüllt), sekundär (Rahmen), dezent (Text), gefährlich (Rot, weiterhin mit Bestätigung); einheitliche Höhen, Icons links — über die vorhandene shadcn-`button`-Basis |
| Formularfelder | Label oben, einheitliche Höhe/Radius, Fokusring Petrol, Fehler rot unter dem Feld, Hinweis grau; Eingabe, Auswahl, Textbereich, Schalter, Haken |
| `Tabelle` | gedämpfte Spaltentitel, feine Trennlinien, Hover; Handy: horizontal scrollbar, erste Spalte fixiert |
| Drawer | Kopf wie `PanelKopf` (Titel Fraunces, Status-Chip, Schliessen), Inhalt in Abschnitten, Aktionen unten fixiert |
| `Leerzustand` | kleines Herz-Icon, ein Satz, optional Knopf |
| Bewegung | nur kurze Übergänge (Hover/Auswahl) und die vorhandenen Puls-Effekte; statisch bei reduzierter Bewegung |

Farben ausschliesslich über Tokens in `app/globals.css` (bestehende plus neue `--nav-*`, `--panel-*`/Schatten falls nötig), jeweils für Hell und Dunkel definiert. Kontrast: Text ≥ 4.5:1, UI-Elemente ≥ 3:1 in beiden Modi.

## 3 · Seiten

- **Matches:** Kopf „Matches“ + Kontext („N neue Treffer · N lange ohne Kontakt“). Panel „Bestandspuls“ (EKG + drei Kennzahlen gut/nachfassen/kritisch). „Neue Treffer“ als einheitliche Karten (Objekt, Anfrage, Score, Kriterien-Chips, „Angebot entwerfen“ primär). „Lange nichts gehört“ als Liste mit „Nachfass entwerfen“.
- **Postfach:** Hauptaktion „Jetzt abrufen“, Abruf-Status in der Kontextzeile. Links Listen-Panel (Filter als Segment-Leiste Alle/Eingang/Website/Gesendet, Kategorie-Chips, Listenzeilen). Rechts Detail-Panel (Kopf: Absender, Betreff, Datum, Chips; Abschnitte Nachricht, Anhänge, KI-Einordnung (nur Mail), Aktionen je Kategorie).
- **Entwürfe:** Hauptaktion „Neue Mail“. Links Liste gruppiert nach Typ mit Abschnittstiteln und Bezug. Rechts Editor-Panel (An, Betreff, Text, Versand-Banner) mit fester Aktionsleiste unten (Senden primär, Speichern sekundär, Löschen gefährlich).
- **Anfragen:** Hauptaktion „Anfrage anlegen“, Kontext („N offen · N vermittelt“). Tabelle mit Puls-Punkt und Status-Chips. Drawer mit Abschnitten Eckdaten, Bester Treffer, Verlauf, Bearbeiten.
- **Objekte:** Hauptaktion „Objekt anlegen“, Kontext („N im Bestand · N öffentlich“). Raster einheitlicher Objektkarten (Titelbild, Titel, Eckdaten, Status-Chip, Direktanfragen/neue Treffer, „nicht öffentlich“). Drawer mit Abschnitten Eckdaten, Beschreibung, Sichtbarkeit, Fotos.
- **Zahlen:** Kacheln als `Kennzahl`; Diagramme in Panels, gruppiert mit Abschnittstiteln: Nachfrage (Anfragen/Monat, Grössen, Nutzungen, Puls), Kommunikation (Mails/Woche, Entwürfe), Objekte (Top-Objekte).
- **Nutzer:** Hauptaktion „Neues Konto“ (öffnet das Formular-Panel); Tabelle mit Avatar, Name, E-Mail, Status-Chip, Haken „darf Nutzer anlegen“, bestehende Aktionen.
- **Profil:** zwei schmale Panels (Name, Passwort ändern) in Maximalbreite.
- **Fehlerseite (`app/admin/error.tsx`):** im neuen Panel-Stil.

## 4 · Umsetzung und Qualität

- Reihenfolge: Tokens + Bausteine → Grundgerüst (Seitenleiste, Seitenkopf, Layout) → Seiten einzeln → Anmelde-Seiten → Gesamtprüfung.
- Bestehende Tests bleiben grün; reine Hilfsfunktionen (z. B. Kontextzeilen-Texte, Statuston-Zuordnung) bekommen Unit-Tests.
- Kein `any`, Dateien < 200 Zeilen, kurze Warum-Kommentare, keine Funktions- oder Ablaufänderung (Review prüft das pro Seite ausdrücklich).
- Live-Test auf der Preview vor dem Merge: jede Seite hell/dunkel, Handy-Breite, reduzierte Bewegung, alle Hauptabläufe einmal durchklicken (Postfach-Aktion, Entwurf speichern, Objekt bearbeiten, Anfrage öffnen, Nutzer-Liste, Login/Logout).

## Nicht im Umfang

Neue Funktionen, geänderte Abläufe oder Texte der Abläufe, Datenbank, öffentliche Website (ausser gemeinsam genutzte Tokens, ohne sichtbare Änderung dort).
