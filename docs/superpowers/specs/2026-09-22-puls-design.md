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
| Prototyp | `docs/puls-cockpit-v5.html` — fehlt noch, wird nachgereicht |
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

**D6 · Zuerst die Kernkette.** Anfrage → Objekt → Match, inklusive des
bidirektionalen Abgleichs. Postfach, Regeln und Zahlen folgen danach.

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
| M5 | Anfragen: Tabelle, Drawer, Inline-Bearbeitung, `?` für Lücken | Anfrage ohne Budget und Bezug speicherbar, Lücken sichtbar |
| M6 | Objekte: Raster, Formular, bidirektionales Rematching in den Server Actions | Neues Objekt erzeugt Matches gegen **alle** offenen Anfragen |
| M7 | Matches: EKG-Hero, Kennzahlkacheln, Match-Karten, Vergleichstabelle, „Lange nichts gehört" | Kernkette vollständig |

**Danach**

| # | Inhalt |
|---|---|
| M8 | Postfach inklusive serverseitig geprüfter Freigabe-Stufen |
| M9 | Regeln |
| M10 | Zahlen |

M4 bis M7 setzen den Prototyp voraus. M0 bis M3 laufen ohne ihn.

## Abnahme

Die acht Kriterien aus dem README gelten unverändert. Ergänzend:

- Ein Push auf einen Feature-Branch lässt GitHub Actions laufen; ein
  fehlschlagender Test verhindert den Merge.
- Ein Pull Request erzeugt ein Vercel-Preview-Deployment.
- Ein Merge auf `main` erzeugt ein Production-Deployment.
- Der erste Vercel-Build gelingt auch ohne gesetzte Umgebungsvariablen.
- Der Keep-alive-Job läuft und hält das Supabase-Projekt aktiv.

## Offene Punkte

- **Prototyp** `docs/puls-cockpit-v5.html` fehlt. Blockiert M4 bis M7.
- **Vercel** ist nicht über ein Werkzeug erreichbar. Projekt verbinden und
  Variablen eintragen macht Davide von Hand.
- **Service-Role-Key** ist über die Supabase-Werkzeuge nicht abrufbar und
  muss aus dem Dashboard kopiert werden.
- **Branch-Schutz** auf `main` setzt Admin-Rechte am Repo voraus. Ohne sie
  gilt D2 als Vereinbarung, nicht als erzwungene Regel.

## Nicht im Umfang

Wie im README: kein echter Mailversand, keine automatische Mail-Auslese,
keine Zahlungsabwicklung, kein Mandantensystem, keine externen
Immobilienplattformen, keine native App. Zusätzlich: kein
Staging-Projekt in Supabase — Preview-Deployments greifen auf dieselbe
Datenbank zu.
