# Secrets einrichten

Anleitung, wo jeder Wert herkommt und wo er eingetragen werden muss. Die beiden echten Geheimnisse (Service-Role-Key, Gemini-Key) stehen hier bewusst nicht als Wert drin — nur wo man sie findet.

---

## Die Werte

| Variable | Öffentlich? | Wo finden |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | ja, unbedenklich | Supabase Dashboard → Projekt **PULS** → *Project Settings* → *Data API* → Feld **Project URL** |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ja, unbedenklich (dafür gemacht) | Supabase Dashboard → Projekt **PULS** → *Project Settings* → *API Keys* → Eintrag **anon / public** (oder **publishable**) |
| `SUPABASE_SERVICE_ROLE_KEY` | **nein — geheim** | Supabase Dashboard → Projekt **PULS** → *Project Settings* → *API Keys* → Eintrag **service_role** (Klick auf „Reveal“/Augensymbol) |
| `GEMINI_API_KEY` | **nein — geheim** | [aistudio.google.com/apikey](https://aistudio.google.com/apikey) → *Create API key* (kostenloses Kontingent, kein Zahlungsmittel nötig) |
| `GMAIL_USER` | ja | `immoheart.business@gmail.com` |
| `GMAIL_APP_PASSWORD` | **nein — geheim** | Google-Konto von immoheart.business → *Sicherheit* → 2-Schritt-Verifizierung aktivieren → [App-Passwörter](https://myaccount.google.com/apppasswords) → Name „immoheart“ → 16 Zeichen **ohne Leerzeichen** eintragen |

Direkt-Link zum Supabase-Projekt: <https://supabase.com/dashboard/project/rvxlvrrpltmuzuomdwdf/settings/api-keys>

**Wichtig:** `SUPABASE_SERVICE_ROLE_KEY` und `GEMINI_API_KEY` gehören **nie** in eine `NEXT_PUBLIC_`-Variable, nie ins Repository, nie in einen Chat oder eine Nachricht — nur direkt ins jeweilige Formularfeld unten kopieren.

---

## Wo eintragen

### 1 · Vercel — alle sechs Werte

*Projekt → Settings → Environment Variables.* Jede der sechs Variablen einmal anlegen, dabei **beide** Haken setzen: **Production** und **Preview**.

```
NEXT_PUBLIC_SUPABASE_URL       (Wert siehe Tabelle oben)
NEXT_PUBLIC_SUPABASE_ANON_KEY  (Wert siehe Tabelle oben)
SUPABASE_SERVICE_ROLE_KEY      (Wert aus Supabase-Dashboard, „service_role“)
GEMINI_API_KEY                 (Wert aus Google AI Studio)
GMAIL_USER                     (Wert siehe Tabelle oben)
GMAIL_APP_PASSWORD             (Wert siehe Tabelle oben)
```

Falls das Projekt in Vercel noch nicht existiert: [vercel.com/new](https://vercel.com/new) → GitHub-Repo `dav08No/immoheart` importieren → Framework wird automatisch als Next.js erkannt → zuerst importieren, danach die sechs Variablen eintragen, dann „Redeploy“.

### 2 · GitHub — nur zwei Werte

*Repo `dav08No/immoheart` → Settings → Secrets and variables → Actions → New repository secret.* Nur diese zwei, für den Keep-alive-Workflow:

```
NEXT_PUBLIC_SUPABASE_URL       (derselbe Wert wie oben)
NEXT_PUBLIC_SUPABASE_ANON_KEY  (derselbe Wert wie oben)
```

`SUPABASE_SERVICE_ROLE_KEY` und `GEMINI_API_KEY` werden hier **nicht** gebraucht.

---

## Kurz-Checkliste

- [ ] Vercel-Projekt importiert
- [ ] Vercel: `NEXT_PUBLIC_SUPABASE_URL` (Production + Preview)
- [ ] Vercel: `NEXT_PUBLIC_SUPABASE_ANON_KEY` (Production + Preview)
- [ ] Vercel: `SUPABASE_SERVICE_ROLE_KEY` (Production + Preview)
- [ ] Vercel: `GEMINI_API_KEY` (Production + Preview)
- [ ] Vercel: `GMAIL_USER` (Production + Preview)
- [ ] Vercel: `GMAIL_APP_PASSWORD` (Production + Preview)
- [ ] GitHub-Secret: `NEXT_PUBLIC_SUPABASE_URL`
- [ ] GitHub-Secret: `NEXT_PUBLIC_SUPABASE_ANON_KEY`
