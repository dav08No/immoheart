# Security Review

**Repository:** `dav08No/immoheart`  
**Prüfdatum:** 2026-11-13  
**Umfang:** Quellcode, Konfiguration, Abhängigkeiten, Lockfile, `.env`-Vorlage, GitHub-Actions, Docker-/Deployment-relevante Dateien, Supabase-Migrationen und Git-Historie. Es wurden keine Dateien mit echten Secrets gefunden; der Check hat keine Codeänderungen vorgenommen.

## 1. Zusammenfassung

Die Produktionsabhängigkeiten zeigen keine Findings in `npm audit --omit=dev`. In den Entwicklungsabhängigkeiten ist jedoch `vitest@2.1.9` mit mehreren bekannten Schwachstellen verknüpft, darunter kritische Advisories in der Test-Toolchain. Das Risiko betrifft vor allem CI und lokale Entwicklungsumgebungen, nicht den Produktionsruntime.

Es wurden keine belastbaren Hinweise auf SQL Injection, Command Injection, XSS, unsichere Deserialisierung, fehlende Authentifizierung in den geprüften Admin-Routen oder Secrets im Repository beziehungsweise in der Git-Historie gefunden. Datenschutz- und Aufbewahrungsanforderungen nach Schweizer DSG/DSGVO sind teilweise dokumentiert, aber für die konkrete Umsetzung zu prüfen.

**Gesamtbewertung: Mittel.** Der wichtigste technische Fix ist die Aktualisierung der Vitest-Testtoolchain. Datenschutz, Löschkonzept und Betroffenenprozesse müssen vor einem produktiven Einsatz fachlich und rechtlich vervollständigt werden.

## 2. Findings

| # | Severity | File | Lines | Vulnerability | Confidence |
|---|----------|------|-------|---------------|------------|
| 1 | 🟠 HIGH | `package.json`, `package-lock.json` | `package.json:58`; `package-lock.json:10883-10908` | Veraltete `vitest@2.1.9`-Toolchain mit bekannten Schwachstellen: `tinypool@1.1.1` (kritische Prototype-Pollution/RCE-Advisories), `@vitest/mocker@2.1.9` (Path Traversal/Code Injection), `vite@5.4.21` und `esbuild@0.21.5` sowie transitive `minimatch`-Probleme. | 9/10 |
| 2 | 🟡 MEDIUM – zu prüfen | `supabase/migrations/20260922195257_schema.sql`, `supabase/migrations/20260927300000_n4_eingang.sql` | `78-90`; `16-23` | Personenbezogene Daten, E-Mail-Inhalte und Anhänge werden gespeichert. Ein technisch erzwingbares Lösch-/Exportverfahren, konkrete Aufbewahrungsfristen und eine dokumentierte Prüfung der Auftragsverarbeiter bzw. Drittlandtransfers sind im Repository nicht erkennbar. | 8/10 |
| 3 | 🟡 MEDIUM – zu prüfen | `app/(public)/datenschutz/page.tsx` | `15-18`, `34-49`, `65-75` | Die Datenschutzerklärung enthält Platzhalter für die verantwortliche Stelle und beschreibt Aufbewahrung, Empfänger und Rechte nur allgemein. Für DSG/DSGVO fehlen möglicherweise konkrete Verantwortliche, Kontakt-/Beschwerdeangaben, Rechtsgrundlagen, Fristen, Übermittlungsgrundlagen und Betroffenenprozesse. | 9/10 |

### Nicht bestätigte beziehungsweise nicht gefundene Kategorien

- **Secrets:** Keine API-Keys, Passwörter, Tokens oder privaten Schlüssel in den getrackten Dateien oder der geprüften Git-Historie. `.env.example` enthält nur leere Platzhalter.
- **Injection:** Keine belastbare SQL-, Command- oder XSS-Injection gefunden. Supabase-Abfragen verwenden die Client-API statt dynamischer SQL-Strings; Benutzereingaben werden überwiegend mit Zod validiert.
- **Authentifizierung/Autorisierung:** Die Admin-Middleware und die geprüften Server Actions prüfen Sitzungen beziehungsweise Profile. Keine konkrete Umgehung wurde nachgewiesen.
- **Datei-Uploads:** Foto-MIME-Typen und Größen werden serverseitig geprüft. Der öffentliche Foto-Bucket ist absichtlich für die Website eingerichtet; ob unveröffentlichte Objektfotos dadurch unbeabsichtigt erreichbar sein dürfen, ist fachlich zu prüfen.
- **Datenbank/RLS:** RLS und sicherheitskritische `SECURITY DEFINER`-Funktionen sind vorhanden und wurden in späteren Migrationen gehärtet. Die aktuelle Rollen-/Berechtigungsspezifikation sollte dennoch gegen die implementierten Policies abgeglichen werden.
- **Konfiguration/CI:** Keine Secrets in Workflows und `permissions: contents: read` ist gesetzt. Die Actions verwenden Versions-Tags statt unveränderlicher Commit-SHAs; das ist ein verbleibendes Supply-Chain-Härtungsthema, aber kein bestätigter Exploit.
- **Kryptografie:** HMAC-SHA-256 wird für Formularschutz und IP-Hashing verwendet. Keine eigene unsichere Verschlüsselung wurde gefunden.
- **Logging/Fehler:** Es werden Fehlerobjekte geloggt, aber nach Prüfung keine Mail-Bodies oder Secrets bewusst protokolliert. Eine produktive Log-Redaction sollte dennoch geprüft werden.

## 3. Konkrete Fixes für kritische und hohe Findings

### Finding 1 – Vitest aktualisieren

`npm audit` meldet als verfügbare Gesamtbehebung ein Upgrade auf `vitest@5.1.0`. Dadurch sollen die betroffenen transitive Abhängigkeiten aktualisiert werden. Die direkte Änderung wäre:

```diff
- "vitest": "2.1.9"
+ "vitest": "5.1.0"
```

Danach müssen `package-lock.json` neu erzeugt und `npm audit`, `npm run test`, `npm run lint`, `npm run build` sowie `npx tsc --noEmit` ausgeführt werden. Das Upgrade ist ein Major-Upgrade und muss auf API-/Konfigurationskompatibilität geprüft werden.

Betroffene Mindestversionen laut Audit:

| Paket | Gesperrte Version | Sichere Mindestversion / empfohlene Behebung |
|---|---:|---:|
| `vitest` | 2.1.9 | `5.1.0` als von npm angebotene Gesamtbehebung |
| `tinypool` | 1.1.1 | mindestens `2.1.2` |
| `@vitest/mocker` | 2.1.9 | Upgrade über `vitest@5.1.0` |
| `vite` | 5.4.21 | mindestens `6.4.4` |
| `esbuild` | 0.21.5 | mindestens `0.24.3` |
| `minimatch` | 3.1.5 / transitive Varianten | mindestens `11.0.1` für das gemeldete Advisory |

## 4. Nächste Schritte nach Priorität

1. `vitest` auf eine gepatchte Version aktualisieren, Lockfile regenerieren und die vollständige CI-Prüfung ausführen.
2. Aufbewahrungsfristen und Löschregeln für Nachrichten, Anhänge, Objektfotos und Formular-Limitdaten fachlich festlegen und serverseitig erzwingen.
3. Betroffenenprozesse für Auskunft, Berichtigung, Löschung, Export und Einschränkung definieren und testen.
4. Datenschutzerklärung mit verantwortlicher Stelle, Rechtsgrundlagen, Fristen, Dienstleistern, Drittlandtransfers und Kontakt-/Beschwerdeinformationen vervollständigen.
5. Prüfen, ob Objektfotos auch für nicht öffentliche Objekte in einem öffentlichen Storage-Bucket liegen dürfen; falls nicht, auf privaten Bucket mit signierten URLs umstellen.
6. GitHub-Actions langfristig auf immutable Commit-SHAs pinnen und einen automatisierten Secret-/Dependency-Scan im CI aktivieren.

## 5. Prüfkommandos und Einschränkungen

- `npm audit --omit=dev --json`: keine Produktionsschwachstellen gemeldet.
- `npm audit --json`: 12 Findings in Entwicklungsabhängigkeiten, davon 2 kritisch und 1 hoch.
- Git-Historie und getrackte sensitive Dateinamen wurden auf typische Secret-Muster geprüft.
- `pip_audit` war in der Umgebung nicht installiert; die Python-Abhängigkeiten konnten daher nicht mit diesem Tool gegen die CVE-Datenbank geprüft werden. `requirements.txt` enthält `openpyxl==3.1.5`; dieser Punkt bleibt für einen vollständigen Python-Abhängigkeitscheck zu verifizieren.
- GitHub Secret Scanning war über die verfügbare Integration nicht abrufbar; Code Scanning ist im Repository nicht aktiviert.
