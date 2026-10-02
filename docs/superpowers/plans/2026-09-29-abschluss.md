# Vermittlungs-Abschluss — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Aus einem versendeten Angebot wird ein Abschluss (reserviert → vermietet/vermittelt) mit KI-Entwürfen für Absagen, Eigentümer und Firma; Eigentümer-Meldungen „nicht mehr verfügbar“ werden erkannt; die gefundenen Prozesslücken sind behoben.

**Architecture:** Additive Migration (Enums, Spalten, Backfill) und atomare Postgres-Übergangsfunktionen (`security invoker`) bilden die Wahrheit über Status. Eine reine TS-Regeldatei spiegelt die erlaubten Übergänge für die Oberfläche. Server Actions rufen erst die Übergangsfunktion, dann erzeugen sie best-effort die KI-Entwürfe; fehlende Entwürfe lassen sich idempotent nachholen. Die Mail-Verarbeitung bekommt die Kategorie `objektmeldung` mit Objekt-Zuordnung.

**Tech Stack:** Next.js 15.5, React 19.1, Supabase (Postgres, RLS), Gemini (`lib/ki/gemini.ts`), Vitest, Tailwind v4 + `components/ui/*` Bausteine aus dem Admin-Design.

**Spec:** `docs/superpowers/specs/2026-09-29-abschluss-design.md`

## Global Constraints

- **Nichts wird automatisch versendet.** Jede Mail ist ein Entwurf (`richtung = 'entwurf'`), Versand nur über `entwurfSenden` per Klick.
- Andere Firmen mit Angebot erhalten **erst bei „Vertrag unterschrieben“** (bzw. bestätigter Objektmeldung „nicht verfügbar“) eine Absage — nie beim Reservieren.
- Migrationen nur **additiv** (Preview und Produktion teilen eine DB); über Supabase MCP `apply_migration` (Projekt `rvxlvrrpltmuzuomdwdf`) **erst nach Freigabe durch den Controller**; Dateien zusätzlich unter `supabase/migrations/`. `ALTER TYPE … ADD VALUE` und Funktionen, die die neuen Werte nutzen, in **getrennten** Migrationen (Postgres erlaubt neue Enum-Werte nicht in derselben Transaktion).
- Neue Funktionen: `security invoker`, `set search_path = public, pg_temp`, `revoke execute … from public, anon`, `grant execute … to authenticated`. Keine neuen Grants an `anon`. RLS-Policies „aktives konto …“ bleiben die einzige Zugriffsregel.
- IDs aus Seed-Tabellen mit `idSchema` (`z.guid()`), nie `z.uuid()`.
- UI nur mit den Bausteinen (`Panel`, `PanelKopf`, `Abschnittstitel`, `StatusChip`, `ListenZeile`, `Button`, `FormFeld`, `Leerzustand`, `Tabelle`, `Kennzahl`) und Tokens; Text `text-ink-2` statt ink-3; 360 px ohne Seiten-Scroll; Ruling R3 (Primäraktion rechts in festen Leisten).
- Kein `any`, Dateien < 200 Zeilen, kurze Warum-Kommentare, deutsche Namen. Gemini-Aufrufe sparsam (Tageslimit): nie ein KI-Aufruf, wenn Empfänger fehlt.
- Checks je Task: `npm run lint && npx tsc --noEmit && npx vitest run && npm run build` — Fehler sichtbar, nicht durch grep verstecken.
- Commits enden mit Leerzeile und exakt:
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`
  `Claude-Session: https://claude.ai/code/session_01CbSKvzEHCKZUWFsZgFgstd`
- Branch `feature/abschluss`, Worktree `.worktrees/abschluss`. Blockierte Befehle: BLOCKED melden.

## Review Focus

1. **Doppelklick / zwei Tabs:** zweites „Reservieren“ desselben Objekts oder zweimal „Vertrag unterschrieben“ → verständliche Meldung, keine doppelten Entwürfe, kein halber Zustand (Test: Übergangsfunktion mit falschem Ausgangsstatus wirft `NutzerFehler`; Entwurfs-Nachholen ist idempotent).
2. **KI-Limit mitten im Abschluss:** Status ist gespeichert, 1 von 3 Entwürfen fehlt → Anzeige „1 Entwurf fehlt“ und Nachholen erzeugt nur diesen (Test in `fehlendeEntwuerfe`).
3. **Fehlende Adressen:** Firma ohne `kontakt_email`, Objekt ohne `eigentuemer_email` → kein KI-Aufruf, klarer Hinweis, Abschluss trotzdem möglich (Test: Empfänger-Vorprüfung ruft `generiereText` nicht).
4. **Mehrdeutige Objektmeldung:** Eigentümer mit zwei aktiven Objekten, Mail ohne Verlauf → keine Zuordnung, „Objekt zuordnen“ (Test in `findeObjektFuerMeldung`).
5. **Reservierung aufheben nach Absage-Verwechslung:** Beim Reservieren entstehen **keine** Absagen; die anderen Treffer bleiben `gesendet` und werden beim Aufheben nicht verändert (Test der Übergangsregeln + SQL-Funktion prüft nur den eigenen Treffer).

---

### Task 1: Migration A (Enums, Spalten, Backfill), Typen, Übergangsregeln

**Files:**
- Create: `supabase/migrations/20260929100000_abschluss_a.sql`, `lib/abschluss/uebergaenge.ts` (+`.test.ts`)
- Modify: `types/database.ts` (regeneriert), `lib/ui/status-ton.ts` (+Test), `components/anfragen/typen.ts` (Labels)

**Interfaces — Produces:**
- `type TrefferStatus = "neu" | "gesendet" | "verworfen" | "reserviert" | "vermittelt" | "abgelehnt" | "erledigt"`
- `TREFFER_STATUS_LABEL: Record<TrefferStatus, string>` — `gesendet: "Angeboten"`, übrige wörtlich (Neu, Verworfen, Reserviert, Vermittelt, Abgelehnt, Erledigt)
- `type TrefferAktion = "reservieren" | "vermitteln" | "aufheben" | "ablehnen"`
- `erlaubteAktionen(treffer: TrefferStatus, objekt: ObjektStatus): TrefferAktion[]` — `gesendet`+`verfuegbar` → `["reservieren","ablehnen"]`; `gesendet`+`reserviert` → `["ablehnen"]`; `reserviert` → `["vermitteln","aufheben"]`; sonst `[]`
- `trefferStatusTon(s: TrefferStatus): Ton` in `lib/ui/status-ton.ts` (gesendet info, reserviert warn, vermittelt gut, abgelehnt/erledigt/verworfen neutral, neu info)

- [ ] **Step 1: Migration schreiben**

```sql
-- Abschluss A: nur additive Änderungen (Preview und Produktion teilen die DB).
alter type match_status_enum add value if not exists 'reserviert';
alter type match_status_enum add value if not exists 'vermittelt';
alter type match_status_enum add value if not exists 'abgelehnt';
alter type match_status_enum add value if not exists 'erledigt';
alter type nachricht_kategorie_enum add value if not exists 'objektmeldung';
alter type nachricht_typ_enum add value if not exists 'absage';
alter type nachricht_typ_enum add value if not exists 'eigentuemer_info';
alter type nachricht_typ_enum add value if not exists 'bestaetigung';

alter table matches
  add column if not exists angeboten_am timestamptz,
  add column if not exists reserviert_am timestamptz,
  add column if not exists abgeschlossen_am timestamptz;

alter table objekte add column if not exists eigentuemer_email text
  check (eigentuemer_email is null or eigentuemer_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$');

-- Eigentümer-Adresse aus der ältesten verknüpften Objektangebot-Mail übernehmen.
update objekte o set eigentuemer_email = lower(sub.von)
from (
  select distinct on (objekt_id) objekt_id, von from nachrichten
  where richtung = 'eingang' and objekt_id is not null and von like '%@%'
  order by objekt_id, coalesce(empfangen_am, created_at)
) sub
where sub.objekt_id = o.id and o.eigentuemer_email is null;

-- angeboten_am aus der ersten wirklich gesendeten Angebotsmail je Treffer.
update matches m set angeboten_am = sub.erst
from (
  select match_id, min(gesendet_am) as erst from nachrichten
  where richtung = 'gesendet' and match_id is not null group by match_id
) sub
where sub.match_id = m.id and m.angeboten_am is null;

-- Lücke 2 (Altfälle): 'gesendet' ohne gesendete Mail und ohne offenen Entwurf -> 'neu'.
update matches m set status = 'neu'
where m.status = 'gesendet' and m.angeboten_am is null
  and not exists (
    select 1 from nachrichten n
    where n.match_id = m.id and n.richtung = 'entwurf' and n.geloescht_am is null
  );
```

Prüfe vorher per `list_tables`/Schema, dass `nachrichten.match_id`, `nachrichten.created_at` und `nachrichten.empfangen_am` existieren; passe Spaltennamen an, falls abweichend, und notiere es im Report.

- [ ] **Step 2: Controller um Freigabe bitten, dann Migration via MCP anwenden** — Implementer meldet `NEEDS_CONTEXT: Migration A bereit` und wartet; der Controller wendet sie an (`apply_migration`, name `abschluss_a`) und prüft `get_advisors` (security).
- [ ] **Step 3: Typen regenerieren** (`generate_typescript_types` → `types/database.ts`), `tsc` muss grün sein.
- [ ] **Step 4: Failing Tests für `erlaubteAktionen` und `trefferStatusTon`** schreiben (alle 7 Status × 3 Objektstatus als Tabelle; speziell: `gesendet`+`reserviert` erlaubt nur `ablehnen`; `vermittelt` erlaubt nichts).
- [ ] **Step 5: Implementieren, Tests grün.**
- [ ] **Step 6: Überall, wo Treffer-Status angezeigt wird, `TREFFER_STATUS_LABEL` nutzen** (`grep -rn "gesendet" components`); „Angeboten“ statt „gesendet“ in der UI.
- [ ] **Step 7: Checks, Commit** `feat(abschluss): Migration A, Treffer-Status und Übergangsregeln`

---

### Task 2: Migration B (Übergangsfunktionen) und Queries

**Files:**
- Create: `supabase/migrations/20260929110000_abschluss_b.sql`, `lib/queries/abschluss.ts`
- Test: `lib/queries/abschluss.test.ts` (Fehlerabbildung, gemockter Client wie in bestehenden Query-Tests)

**Interfaces — Produces** (`lib/queries/abschluss.ts`):
- `type Uebergang = { objekt_id: string; anfrage_id: string | null; erledigte_treffer: string[] }`
- `reserviereTreffer(matchId: string): Promise<Uebergang>`
- `vermittleTreffer(matchId: string): Promise<Uebergang>` — `erledigte_treffer` = andere `gesendet`-Treffer desselben Objekts (→ Absagen)
- `hebeReservierungAuf(matchId: string): Promise<Uebergang>`
- `lehneTrefferAb(matchId: string): Promise<void>`
- `meldeObjektNichtVerfuegbar(objektId: string): Promise<Uebergang>` — `erledigte_treffer` = alle vorher `gesendet`/`reserviert`-Treffer
- `setzeObjektWiederVerfuegbar(objektId: string): Promise<void>`
- Postgres-Fehler `P0001` (raise exception mit deutschem Text) → `NutzerFehler(text)`; alles andere wird weitergeworfen.

- [ ] **Step 1: SQL-Funktionen schreiben.** Muster (alle sechs analog):

```sql
create function treffer_reservieren(p_match uuid)
returns table (objekt_id uuid, anfrage_id uuid, erledigte_treffer uuid[])
language plpgsql security invoker set search_path = public, pg_temp as $$
declare m matches%rowtype; o objekte%rowtype;
begin
  select * into m from matches where id = p_match for update;
  if not found then raise exception 'Treffer nicht gefunden.'; end if;
  if m.status <> 'gesendet' then raise exception 'Nur angebotene Treffer können reserviert werden.'; end if;
  select * into o from objekte where id = m.objekt_id for update;
  if o.status <> 'verfuegbar' then raise exception 'Das Objekt ist nicht mehr verfügbar.'; end if;

  update objekte set status = 'reserviert' where id = o.id;
  update matches set status = 'reserviert', reserviert_am = now() where id = m.id;
  -- Andere angebotene Treffer bleiben 'gesendet': Absagen erst bei Vertragsabschluss.
  delete from matches where objekt_id = o.id and status = 'neu';
  return query select o.id, m.anfrage_id, array[]::uuid[];
end $$;
revoke execute on function treffer_reservieren(uuid) from public, anon;
grant execute on function treffer_reservieren(uuid) to authenticated;
```

Weitere Regeln (exakt nach Spec §1):
- `treffer_vermitteln`: Ausgang `reserviert`; Objekt → `vermietet`; Treffer → `vermittelt`, `abgeschlossen_am = now()`; Anfrage → `vermittelt`; andere `gesendet`-Treffer **des Objekts** → `erledigt` (IDs zurückgeben); andere `gesendet`-Treffer **der Anfrage** → `erledigt` (nicht in der Rückgabe, keine Absage — die Firma hat ja abgeschlossen); `neu`-Treffer von Objekt und Anfrage löschen.
- `reservierung_aufheben`: Ausgang `reserviert`; Objekt → `verfuegbar`; Treffer → `gesendet`, `reserviert_am = null`. Rematching macht die App.
- `treffer_ablehnen`: Ausgang `gesendet` → `abgelehnt`.
- `objekt_nicht_verfuegbar`: Objekt `verfuegbar`/`reserviert` → `vermietet`; alle `gesendet`/`reserviert`-Treffer → `erledigt` (IDs zurück); `neu` löschen.
- `objekt_wieder_verfuegbar`: Objekt `reserviert`/`vermietet` → `verfuegbar`; ein `reserviert`-Treffer → `gesendet`, `reserviert_am = null`; `vermittelt`-Treffer und Anfragen unverändert.

- [ ] **Step 2: NEEDS_CONTEXT an Controller (Migration B anwenden), danach `get_advisors`** — keine neuen Warnungen zu den Funktionen.
- [ ] **Step 3: Failing Tests für `lib/queries/abschluss.ts`** (RPC-Fehler `P0001` → `NutzerFehler` mit Originaltext; Rückgabe gemappt auf `Uebergang`).
- [ ] **Step 4: Implementieren (`supabase.rpc(...)`), Typen regenerieren falls nötig, Tests grün.**
- [ ] **Step 5: Checks, Commit** `feat(abschluss): atomare Übergangsfunktionen`

---

### Task 3: KI — neue Entwürfe und Einordnung

**Files:**
- Modify: `lib/ki/entwuerfe.ts` (+Test), `lib/ki/einordnung.ts` (+Test)
- Create: `lib/ki/abschluss-entwuerfe.ts` (+Test), falls `entwuerfe.ts` sonst > 200 Zeilen

**Interfaces — Produces:**
- `entwurfAbsage(p: { objektTitel: string; anfrageKurz: string | null }): Promise<Mailentwurf>`
- `type EigentuemerAnlass = "reserviert" | "vermietet" | "aufgehoben" | "meldung_dank"`
- `entwurfEigentuemerInfo(p: { objektTitel: string; anlass: EigentuemerAnlass; meldung?: string }): Promise<Mailentwurf>`
- `entwurfBestaetigung(p: { objektTitel: string; firma: string | null }): Promise<Mailentwurf>`
- `baueAntwortPrompt` erweitert um optional `angebot: { objektTitel: string; eckdaten: string } | null` — mit Angebot: Rolle bleibt `ANTWORT_ROLLE`; Anweisung „Die Firma antwortet auf das Angebot für <Objekt>. Gehe auf ihr Anliegen ein (z. B. Besichtigungswunsch aufnehmen), erfinde keine Termine, Preise oder weiteren Objekte.“ statt „prüft passende Flächen“.
- Einordnung: `Kategorie` + `"objektmeldung"`; `Einordnung` + `meldung: { aenderung: "nicht_verfuegbar" | "wieder_verfuegbar" | "sonstige_aenderung"; zusammenfassung: string } | null` und `kein_interesse: boolean`. Prompt ergänzt: `"objektmeldung": ein Eigentümer meldet eine Änderung an einer bereits angebotenen/vermittelten Fläche (vermietet, nicht mehr verfügbar, wieder frei, Preis/Fläche geändert).` und `"kein_interesse": true nur wenn eine Antwort klar ablehnt.` Parser: unbekannte `aenderung` → `sonstige_aenderung`; fehlend → `meldung: null`; `kein_interesse` nur `true` bei boolean `true`.

- [ ] **Step 1: Failing Tests** — Prompt-Bau je Entwurf enthält Objekttitel, Rolle, `AUSGABEFORMAT`, keine erfundenen Details-Anweisung; Absage ohne `anfrageKurz` funktioniert; Einordnung parst `objektmeldung`, ungültige `aenderung`, `kein_interesse` String `"true"` → false.
- [ ] **Step 2: Implementieren, Tests grün.**
- [ ] **Step 3: Checks, Commit** `feat(ki): Entwürfe für Absage, Eigentümer, Bestätigung; Objektmeldung erkennen`

---

### Task 4: Abschluss-Actions und Entwurfserzeugung (idempotent)

**Files:**
- Create: `lib/abschluss/entwuerfe-plan.ts` (+Test), `app/actions/abschluss.ts`, `lib/queries/abschluss-entwuerfe.ts`
- Modify: `lib/queries/nachrichten.ts` nur falls ein Lese-Helfer fehlt

**Interfaces — Produces:**
- `type GeplanterEntwurf = { typ: "absage" | "eigentuemer_info" | "bestaetigung"; an: string; match_id: string | null; objekt_id: string; anlass?: EigentuemerAnlass }`
- `planeEntwuerfe(p: { aktion: "reservieren" | "vermitteln" | "aufheben" | "nicht_verfuegbar"; objekt: { id: string; titel: string; eigentuemer_email: string | null }; treffer: { id: string; firmaEmail: string | null } | null; erledigte: { id: string; firmaEmail: string | null }[] }): { geplant: GeplanterEntwurf[]; hinweise: string[] }` — pure. Reservieren: nur Eigentümer (`reserviert`); Vermitteln: Absage je erledigtem Treffer + Eigentümer (`vermietet`) + Bestätigung; Aufheben: Eigentümer (`aufgehoben`); nicht_verfuegbar: Absage je erledigtem. Fehlende Adressen → kein Eintrag, dafür Hinweis („Eigentümer-E-Mail fehlt – keine Info-Mail möglich“, „<Firma> hat keine E-Mail – keine Absage möglich“).
- `fehlendeEntwuerfe(geplant: GeplanterEntwurf[], vorhanden: { typ: string; an: string; match_id: string | null; objekt_id: string | null }[]): GeplanterEntwurf[]` — Schlüssel `typ|an(lowercase)|match_id|objekt_id`; vorhanden zählt auch gesendete und gelöschte nicht (gelöscht = bewusst verworfen, nicht erneut erzeugen → **gelöschte zählen als vorhanden**).
- Server Actions (alle `holeEigenesProfil()` zuerst, `idSchema`, Rückgabe `Ergebnis & { hinweise?: string[]; fehlend?: number }`): `trefferReservieren(matchId)`, `trefferVermitteln(matchId)`, `reservierungAufheben(matchId)` (danach `berechneUndSpeichereMatchesFuerObjekt`), `trefferAblehnen(matchId)`, `objektNichtVerfuegbar(objektId, eingangId?)`, `objektWiederVerfuegbar(objektId)` (danach Rematching), `abschlussEntwuerfeNachholen(objektId)`.
- Ablauf jeder Aktion: Übergang (Task 2) → Daten laden → `planeEntwuerfe` → `fehlendeEntwuerfe` gegen existierende Nachrichten → je Entwurf KI-Aufruf + `legeNachrichtAn` in `try/catch` einzeln; Fehler zählen als `fehlend`. Absagen mit Verlauf des Angebots: `betreffFuerAnfrage`-Logik aus `app/actions/matches.ts` wiederverwenden (in `lib/` auslagern, nicht duplizieren).
- `revalidatePath` für `/admin`, `/admin/anfragen`, `/admin/objekte`, `/admin/entwuerfe`, `/admin/postfach`, `/objekte`, layout.

- [ ] **Step 1: Failing Tests `planeEntwuerfe`** (Reservieren erzeugt **keine** Absage; Vermitteln mit 2 erledigten → 2 Absagen + Eigentümer + Bestätigung; fehlende Adressen → Hinweise statt Einträge).
- [ ] **Step 2: Failing Tests `fehlendeEntwuerfe`** (KI-Limit-Fall: 1 von 3 vorhanden → 2 fehlen; gelöschter Entwurf zählt als vorhanden; Gross/Klein der Adresse egal).
- [ ] **Step 3: Implementieren, Tests grün.**
- [ ] **Step 4: Actions implementieren**; Test der Empfänger-Vorprüfung: bei fehlender Adresse wird `generiereText` nicht aufgerufen (Mock).
- [ ] **Step 5: Checks, Commit** `feat(abschluss): Aktionen und idempotente Entwurfserzeugung`

---

### Task 5: Lücken im Angebots-/Nachfass-Ablauf

**Files:**
- Modify: `app/actions/matches.ts`, `app/actions/entwurf-senden.ts`, `lib/queries/matches.ts`, `lib/queries/versand.ts` (oder neue kleine Query-Datei), betroffene Tests

**Änderungen:**
- `matchSenden`: Empfänger **vor** KI prüfen; existiert ein offener Angebots-Entwurf (`match_id = id`, `richtung = 'entwurf'`, `geloescht_am is null`) → dessen id zurückgeben ohne KI; Status bleibt `neu` (kein `aktualisiereMatchStatus(…, "gesendet")` mehr hier). Guard „bereits bearbeitet“ gilt für Status ≠ `neu`.
- `entwurfSenden`: nach erfolgreichem `markiereGesendet` best-effort `matches` `neu → gesendet`, `angeboten_am = now()` für `entwurf.match_id` (bedingtes Update `.eq("status","neu")`, Fehler nur loggen — gleiches Muster wie `letzter_kontakt`).
- `anfrageNachfragen`: Empfänger vor KI; offener Nachfass-Entwurf zur Anfrage → dessen id zurück.
- `holeBesterMatchFuerAnfrage`: `.in("status", ["neu","gesendet"])`.
- Matches-Übersicht „Neue Treffer“ zeigt weiterhin nur `neu`; ein Treffer mit offenem Angebots-Entwurf zeigt statt „Angebot entwerfen“ den Knopf „Entwurf öffnen“ (gleiche Action, liefert bestehende id).

- [ ] **Step 1: Failing Tests** — Nachfass-Dedup, Angebot-Dedup, Empfänger-Vorprüfung ohne KI, Versand setzt Treffer auf `gesendet` (Mock-Client prüft bedingtes Update), Fehler dabei bricht Versand-Ergebnis nicht.
- [ ] **Step 2: Implementieren, Tests grün.**
- [ ] **Step 3: Checks, Commit** `fix(ablauf): Treffer erst beim Versand angeboten, keine doppelten Entwürfe`

---

### Task 6: Objektmeldung in der Mail-Verarbeitung, Eigentümer-E-Mail

**Files:**
- Create: `lib/eingang/objekt-zuordnung.ts` (+Test)
- Modify: `lib/eingang/verarbeitung.ts`, `lib/queries/verarbeitung.ts`, `app/actions/objekte.ts` (`objektAnlegen` setzt `eigentuemer_email` aus Herkunftsmail), `app/actions/eingang-aktionen.ts` (+ `objektZuordnen(nachrichtId, objektId)`), `lib/postfach.ts` (Chip), `components/objekte/ObjektFelder.tsx`/`ObjektFormular.tsx` (Feld „Eigentümer-E-Mail“), Objekt-Zod-Schema

**Interfaces — Produces:**
- `findeObjektFuerMeldung(p: { referenzen: string[]; gesendete: { message_id: string; objekt_id: string | null }[]; absender: string; aktiveNachEigentuemer: Record<string, string[]> }): { objektId: string; grund: "verlauf" | "eigentuemer" } | null` — gleiche Logik wie `findeAnfrageFuerAntwort` (jüngste Referenz gewinnt; Eigentümer nur eindeutig).
- Verarbeitung `objektmeldung`: speichert `kategorie`, `erkannte_felder = { meldung }`, `objekt_id` (falls zugeordnet); legt **nur** den Dank-Entwurf an den Eigentümer an (`typ eigentuemer_info`, `antwort_auf = eingang.id`, `objekt_id`), über `legeEntwurfAn`-Muster (höchstens einer pro Eingang).
- Verarbeitung `antwort`: ist die zugeordnete Anfrage per Verlauf an eine gesendete **Angebots**-Mail gebunden, lädt sie Objekt + Treffer und übergibt `angebot` an `entwurfAntwort`; speichert `kein_interesse` und `match_id` in `erkannte_felder`.

- [ ] **Step 1: Failing Tests `findeObjektFuerMeldung`** (Verlauf; eindeutiger Eigentümer; zwei Objekte desselben Eigentümers → null; Gross/Klein).
- [ ] **Step 2: Implementieren, Tests grün.**
- [ ] **Step 3: Verarbeitung erweitern** (Test mit gemockten Queries: objektmeldung → genau ein Entwurf, kein Statuswechsel).
- [ ] **Step 4: Eigentümer-E-Mail im Formular** (optional, Zod `z.email().nullable()` bzw. leer → null), `objektAnlegen` übernimmt Absender der Herkunftsmail, wenn Feld leer.
- [ ] **Step 5: Checks, Commit** `feat(eingang): Objektmeldungen erkennen und zuordnen, Eigentümer-E-Mail`

---

### Task 7: Anfrage-Panel — Angebote, Status

**Files:**
- Create: `components/anfragen/AnfrageAngebote.tsx`, `components/abschluss/AbschlussAktionen.tsx` (wiederverwendet in Task 8), `components/abschluss/AbschlussDialog.tsx`
- Modify: `app/api/anfragen/[id]/detail/route.ts` (+ `angebote`), `components/anfragen/AnfrageDetail.tsx`, `AnfrageBearbeiten.tsx` (Status-Auswahl), `app/actions/anfragen.ts` (Status ruhend/vermittelt/offen; zurück auf `offen` → Rematching; manuell `vermittelt` → `neu`-Treffer der Anfrage löschen), `lib/queries/matches.ts` (+ `holeAngeboteFuerAnfrage`)

**Interfaces:**
- `holeAngeboteFuerAnfrage(anfrageId): Promise<{ id: string; status: TrefferStatus; angeboten_am: string | null; objekt: { id: string; titel: string; status: ObjektStatus }; reserviertFuer: string | null }[]>` — Status ∉ {neu, verworfen}; `reserviertFuer` = Firmenname, wenn das Objekt für einen **anderen** Treffer reserviert ist.
- `AbschlussAktionen({ matchId, trefferStatus, objektStatus, andereAngebote: number, onFertig })` — Knöpfe aus `erlaubteAktionen`; Dialog nennt Folgen: Reservieren → „N andere Firmen haben ein Angebot – sie erhalten erst bei Vertragsabschluss eine Absage“; Vermitteln → „N andere Firmen erhalten einen Absage-Entwurf“; zeigt nach Erfolg `hinweise` und „N Entwürfe fehlen“ + „Entwürfe erneut erzeugen“.
- Leerzustand „Noch keine Angebote gesendet.“

- [ ] **Step 1: Test für die Dialog-Folgentexte** (pure Funktion `folgenText(aktion, andere)` in `lib/abschluss/`).
- [ ] **Step 2: UI bauen** (Bausteine, R3, 360 px, Fokus zurück nach Dialog).
- [ ] **Step 3: Status-Auswahl + Action-Logik**, Test für die Rematching-Bedingung.
- [ ] **Step 4: Checks, Commit** `feat(anfragen): Angebote und Abschluss im Anfrage-Panel`

---

### Task 8: Objekt-Panel — Interessenten, Status nur über Aktionen

**Files:**
- Create: `components/objekte/ObjektInteressenten.tsx`
- Modify: `components/objekte/ObjekteAnsicht.tsx`/Drawer, `ObjektFormular.tsx` (Status-Select entfernen; `objektAktualisieren` akzeptiert `status` nicht mehr aus dem Formular — Schema anpassen), `lib/queries/objekte.ts` (+ `holeInteressenten(objektId)`)

- [ ] Interessenten-Liste (Firma, Status-Chip, Angebotsdatum, `AbschlussAktionen`); Knopf „Wieder verfügbar setzen“ bei `reserviert`/`vermietet` mit Bestätigung; bei fehlenden Entwürfen „Entwürfe erneut erzeugen“.
- [ ] Test: Objekt-Update-Schema lehnt `status` ab.
- [ ] Checks, Commit `feat(objekte): Interessenten und Abschluss im Objekt-Panel`

---

### Task 9: Postfach, Entwürfe, Matches, Website, Zahlen

**Files:** `components/postfach/AktionenObjektmeldung.tsx` (neu), `EingangDetail.tsx`, `AktionenAntwort.tsx` („Firma lehnt ab“ bei `kein_interesse` und `match_id`), `lib/postfach.ts`, `components/entwuerfe/EntwurfListe.tsx` (Gruppe „Abschluss“), `components/matches/*` (Kennzahl „Reserviert“), `lib/admin/kontext.ts` (+Test), öffentliche Objekt-Karte/Detail (Chip „Reserviert“, Hinweis im Anfrageformular), `lib/zahlen/*` + `lib/queries/zahlen.ts` + `app/admin/zahlen/page.tsx` („Tage bis Erstangebot“ aus `angeboten_am`, neue Kennzahl „Tage bis Abschluss“)

- [ ] `AktionenObjektmeldung`: Zusammenfassung der KI, zugeordnetes Objekt (Link) oder „Objekt zuordnen“ (Auswahl verfügbarer/reservierter Objekte); Knopf je `aenderung` (§2 der Spec) mit Bestätigungsdialog und Hinweisen.
- [ ] Test `tageBisAbschluss` (Median, negative Spannen ignoriert) analog `tageBisErstangebot`.
- [ ] Kontextzeile Matches um „N reserviert“ (Test).
- [ ] Checks, Commit `feat(abschluss): Postfach, Entwürfe, Matches, Website und Zahlen`

---

### Task 10: Gesamtprüfung, Push

- `npm run lint && npx tsc --noEmit && npx vitest run && npm run build && npm audit --omit=dev`
- `get_advisors` (security + performance) ohne neue Befunde.
- `grep -rn "\"gesendet\"" components` zeigt keine rohe Anzeige des Status mehr.
- Push; Final-Review (opus) über den ganzen Branch; Befunde beheben.

### Task 11: Live-Test (Controller + Davide), Merge

Nach Spec §4 „Live-Test“: Angebot an Firma A senden → Angebot für dasselbe Objekt an Firma B → Reservieren (Eigentümer-Entwurf, **keine** Absage) → Aufheben → Reservieren → Vertrag unterschrieben (Absage an B, Eigentümer-Info, Bestätigung an A) → Test-Objektmeldung per Mail an die immoheart-Gmail (von davide.nocito28@yahoo.com, Eigentümer-Adresse eines Testobjekts) → erkannt → „Objekt als vermietet markieren“. Test-Mails nur an bekannte Testadressen; Testdaten danach aufräumen (Eingänge soft löschen, Testobjekte/-anfragen zurücksetzen). Davides OK → Merge.

## Abnahme

- Abschluss-Ablauf vollständig, Absagen erst bei Vermietung, alle Entwürfe nur als Entwurf.
- Objektmeldungen erkannt, zugeordnet oder zur Auswahl gestellt; Aktion per Klick.
- Lücken 2–8 aus der Spec behoben; Zahlen zeigen echte Werte.
