# PULS — Design

Datum: 2026-09-22 · Status: zur Freigabe

## Zweck

Dieses Dokument hält fest, was das README offen lässt: die Deployment- und
CI/CD-Kette, den Umgang mit der Verfügbarkeit und den Schnitt der
Meilensteine. Fachliche Anforderungen, Datenmodell, Matching-Gewichtung,
Ansichten und Gestaltungsregeln stehen im README und werden hier **nicht
wiederholt** — das README bleibt die fachliche Quelle.

## Ausgangslage

| | |
|---|---|
| Repo | `github.com/SergeSchaerer/espaceSolothurn`, Branch `main`, bisher nur `README.md` |
| Prototyp | `docs/puls-cockpit-v5.html` — vorhanden, durchgesehen |
| Notion | Für den Connector nicht freigegeben; Abschnitt „Ergänzungen aus Notion" im README ist leer |
| Toolchain | Node 22.14, npm 11.6.2, Supabase CLI 2.51 |
| Supabase | Projekt `PULS`, Ref `rvxlvrrpltmuzuomdwdf`, Region `eu-central-2`, Free-Plan |

## Entscheidungen

**D1 · CI und CD sind getrennt.** GitHub Actions prüft, Vercel deployt.
Actions läuft bei jedem Push und jedem Pull Request und führt `lint`,
`tsc --noEmit`, `test` und `build` aus. Die Vercel-Git-Integration baut
Previews aus Pull Requests und Production aus `main`. Kein Deploy-Token
als GitHub-Secret, weil kein Actions-Job deployt.

**D2 · `main` ist immer deploybar.** Gearbeitet wird auf Feature-Branches,
zusammengeführt wird per Pull Request. Jeder Meilenstein endet auf einem
lauffähigen Stand — keine halben Funktionen auf `main`.

**D3 · Der Build darf keine Umgebungsvariablen brauchen.** Der
Supabase-Client wird erst zur Laufzeit aufgelöst, nicht beim Modulimport.
Sonst schlägt der allererste Vercel-Build fehl, bevor überhaupt Keys
eingetragen werden können. In `lib/supabase/` wird deshalb pro Aufruf ein
Client erzeugt, nicht als Modul-Singleton beim Import.

**D4 · Gegen die Pausierung läuft ein Keep-alive.** Supabase pausiert
Projekte im Free-Plan nach sieben Tagen ohne Aktivität. Ein pausiertes
Projekt macht die Seite erreichbar, aber funktionslos. Ein
Actions-Cronjob (alle zwei Tage) setzt eine minimale Abfrage ab. Ein
Wechsel auf Supabase Pro würde das erübrigen, ist aber ein Kostenentscheid
und nicht Teil dieses Designs.

**D5 · Matching und Puls entstehen testgetrieben, vor der Oberfläche.**
Wie im README gefordert. Sie sind die einzige getestete Logik.

**D6 · Zuerst die Kernkette, aber Postfach und KI-Mailerkennung ziehen
vor.** Der Prototyp (`docs/puls-cockpit-v5.html`) zeigt bereits, wo die
KI eingreift: Postfach-Eingang zerlegt Rohtext in Felder, Lücken lösen
einen Rückfrage-Entwurf aus, ein bestätigter Match erzeugt einen
Angebots-Entwurf, alte Anfragen einen Nachfass-Entwurf — jeweils mit
Fake-Daten simuliert. Das wird jetzt echt gebaut, und zwar früh: Postfach
mit KI-Erkennung kommt direkt nach Auth und Layout, vor den UI-Bildschirmen
für Anfragen und Objekte (siehe Meilensteine).

**D7 · Mail-Eingang bleibt manuelles Einfügen, das Lesen übernimmt die
KI.** Mitarbeitende fügen den Rohtext einer eingehenden Mail über ein
Formular im Postfach ein. Kein IMAP, kein Webhook, kein externer
Maildienst — das wäre Infrastruktur, die der aktuelle Bedarf nicht
rechtfertigt. Ab dort übernimmt die KI das Lesen: Sie zerlegt den Text in
die Felder der `anfragen`-Tabelle (`erkannte_felder`).

**D8 · Die KI ergänzt die Matching-Logik, sie ersetzt sie nicht.** Zwei
getrennte Zuständigkeiten:
- **Deterministisch** (unverändert aus dem README): `lib/matching.ts`
  bleibt eine reine, mit Vitest getestete Funktion mit festen Gewichten.
  Sie liefert Score und Kriterien-Tabelle — reproduzierbar, kostenlos,
  ohne externe Abhängigkeit, so wie das README es ausdrücklich verlangt
  („keine Postgres-Trigger, keine Edge Function … muss lesbar, testbar
  und leicht änderbar sein").
- **Sprachlich** (neu, durch die KI): ein LLM-Aufruf für die zwei
  Aufgaben, die eine reine Funktion nicht leisten kann — unstrukturierten
  Mailtext in Felder zerlegen (`erkenneFelder`), und aus vorhandenen
  Daten (Anfrage, Objekt, Kriterien aus `matching.ts`) einen Mailtext
  formulieren (`entwurfAngebot`, `entwurfRueckfrage`, `entwurfNachfass`).

**D9 · KI-Aufrufe sind serverseitig, ihre reinen Teile sind testbar.**
`lib/ki/erkennung.ts` und `lib/ki/entwuerfe.ts`, aufgerufen ausschliesslich
aus Server Actions — nie vom Client, wie der Service-Role-Key. Der
eigentliche LLM-Aufruf ist nicht deterministisch und wird nicht mit
echten Aufrufen getestet. Prompt-Aufbau und Antwort-Parsing sind aber als
reine Funktionen herausgezogen und werden mit Vitest gegen Beispieltexte
geprüft.

**D10 · Freigabestufen gelten unverändert für KI-Entwürfe.** Jeder von
der KI vorbereitete Text — Rückfrage, Angebot, Nachfass — landet als
Entwurf im Postfach. Stufe 1: nichts verlässt das System ohne Klick.
Stufe 2: Rückfragen bei fehlenden Angaben gehen automatisch raus,
Angebote weiterhin erst nach Freigabe. Stufe 3: auch Angebote automatisch.
Geprüft wird das serverseitig in der Server Action, wie im README
gefordert. „Senden" heisst wie im gesamten Projekt: `gesendet_am` wird
gesetzt — es geht keine echte E-Mail raus (README, „Nicht bauen").

## Deployment-Kette

```
Feature-Branch ──push──> GitHub Actions (lint · tsc · test · build)
       │                          │
       │                          └── rot → kein Merge
       └──Pull Request──> Vercel Preview-Deployment
                    │
                 Merge
                    ↓
                  main ──> Vercel Production  (die durchgehend erreichbare Seite)
                    ↑
       GitHub Actions Cron (alle 2 Tage) ──> Supabase Keep-alive
```

## Umgebungsvariablen

Dieselben drei in `.env.local` (lokal) und in den Vercel-Projekteinstellungen
für Production **und** Preview:

| Variable | Wert |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://rvxlvrrpltmuzuomdwdf.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | der Publishable Key des Projekts |
| `SUPABASE_SERVICE_ROLE_KEY` | nur aus dem Supabase-Dashboard, **nie** mit `NEXT_PUBLIC_` und nie im Repo |
| `ANTHROPIC_API_KEY` | aus der [Anthropic Console](https://console.anthropic.com/settings/keys), nur serverseitig, nie `NEXT_PUBLIC_` |

`.env.local` steht in `.gitignore`. `.env.example` enthält die Namen ohne Werte.

## Meilensteine

Jeder Schritt endet grün, deploybar und auf Vercel sichtbar.

**Kernkette**

| # | Inhalt | Fertig, wenn |
|---|---|---|
| M0 | Next.js, TypeScript strict, Tailwind, Vitest, ESLint, Actions-Workflow, Vercel verbunden | Leere App live, CI grün |
| M1 | Migrationen, Enums, RLS, View `anfragen_sichtbar`, Seed, generierte Typen | Schema steht, `types/database.ts` erzeugt |
| M2 | `lib/puls.ts`, `lib/matching.ts`, `lib/format.ts` — testgetrieben | Vitest deckt Gewichtung, Preistoleranz, Null-Felder und die Grenze bei Score 60 ab |
| M3 | Auth, Login, geschützte Routen, Rollen, Profile | Anmeldung funktioniert, `leser` sieht vertrauliche Felder nicht |
| M4 | Design-Tokens, Cambria/Outfit, Seitenleiste, Kopfzeile, Drawer, Dunkelmodus | Layout entspricht dem Prototyp |
| M5 | **Postfach + KI-Mailerkennung.** Eingang einfügen, `erkenneFelder` extrahiert `erkannte_felder`, Lücken als `?`-Kacheln, „Als Anfrage speichern", bei Lücken automatisch ein Rückfrage-Entwurf (`entwurfRueckfrage`). Entwürfe: Filter Alle/Eingang/Entwürfe, Bearbeiten/Senden/Verwerfen, Verwerfen mit Grund → neue Regel. Freigabestufen serverseitig geprüft. | Eingefügter Mailtext erzeugt Felder und ggf. einen Rückfrage-Entwurf; auf Stufe 1 verlässt nichts das System ohne Klick |
| M6 | Anfragen: Tabelle, Drawer, Inline-Bearbeitung, `?` für Lücken | Anfrage ohne Budget und Bezug speicherbar, Lücken sichtbar |
| M7 | Objekte: Raster, Formular, bidirektionales Rematching in den Server Actions | Neues Objekt erzeugt Matches gegen **alle** offenen Anfragen |
| M8 | Matches: EKG-Hero, Kennzahlkacheln, Match-Karten, Vergleichstabelle, „Lange nichts gehört". **KI-Entwürfe:** „Angebot senden" auf einer Match-Karte erzeugt einen Angebots-Entwurf (`entwurfAngebot`) im Postfach statt direkt zu senden; „Nachfragen" auf einer stillen Anfrage erzeugt einen Nachfass-Entwurf (`entwurfNachfass`) | Kernkette inklusive KI-Entwürfen vollständig |

**Danach**

| # | Inhalt |
|---|---|
| M9 | Regeln — eigene Ansicht für die in M5 bereits angelegten Einträge |
| M10 | Zahlen |

M4 bis M8 setzen den Prototyp voraus. M0 bis M3 laufen ohne ihn.
M5 und M8 setzen zusätzlich `ANTHROPIC_API_KEY` voraus (siehe
Umgebungsvariablen) — ohne Schlüssel bleiben Felder leer bzw. es entsteht
kein Entwurf, das Speichern von Hand funktioniert trotzdem weiter.

## Abnahme

Die acht Kriterien aus dem README gelten unverändert. Ergänzend:

- Ein Push auf einen Feature-Branch lässt GitHub Actions laufen; ein
  fehlschlagender Test verhindert den Merge.
- Ein Pull Request erzeugt ein Vercel-Preview-Deployment.
- Ein Merge auf `main` erzeugt ein Production-Deployment.
- Der erste Vercel-Build gelingt auch ohne gesetzte Umgebungsvariablen.
- Der Keep-alive-Job läuft und hält das Supabase-Projekt aktiv.

## Offene Punkte

- **Vercel** ist nicht über ein Werkzeug erreichbar. Projekt verbinden und
  Variablen eintragen macht Davide von Hand.
- **Service-Role-Key** ist über die Supabase-Werkzeuge nicht abrufbar und
  muss aus dem Dashboard kopiert werden.
- **ANTHROPIC_API_KEY** muss Davide aus der Anthropic Console besorgen
  und in `.env.local` sowie bei Vercel eintragen.
- **Branch-Schutz** auf `main` setzt Admin-Rechte am Repo voraus. Ohne sie
  gilt D2 als Vereinbarung, nicht als erzwungene Regel.

## Nicht im Umfang

Wie im README: kein echter Mailversand (Entwürfe werden gespeichert,
`gesendet_am` gesetzt, es geht keine echte E-Mail raus), keine
Zahlungsabwicklung, kein Mandantensystem, keine externen
Immobilienplattformen, keine native App. Zusätzlich: kein
Staging-Projekt in Supabase — Preview-Deployments greifen auf dieselbe
Datenbank zu. Kein echter Posteingang (IMAP/Webhook) — Mailtext kommt
per Einfügen ins Postfach, siehe D7; das ist eine bewusste Abweichung
von der ursprünglichen README-Formulierung „keine automatische
Mail-Auslese", die sich noch auf reine Seed-Daten bezog.
