-- Verhindert Selbst-Hochstufung: ohne WITH CHECK erlaubt die UPDATE-Policy
-- jedem eingeloggten Nutzer, die eigene rolle-Spalte beliebig zu setzen.
drop policy "eigenes profil aktualisieren" on profiles;

create policy "eigenes profil aktualisieren" on profiles for update
  using (user_id = auth.uid() or current_rolle() = 'admin')
  with check (
    current_rolle() = 'admin'
    or rolle = (select p2.rolle from profiles p2 where p2.user_id = auth.uid())
  );

-- security_invoker fehlte: die View lief mit den Rechten des Besitzers
-- (postgres, bypasst RLS), nicht mit denen der aufrufenden Session, wodurch
-- RLS auf anfragen fuer niemanden griff. Zusaetzlich auf "fail closed"
-- umgestellt: eine unbestimmte Rolle (current_rolle() = null) maskiert jetzt
-- auch, statt die echten Werte durchzulassen.
create or replace view anfragen_sichtbar
with (security_invoker = true)
as
select
  a.id,
  case when (not a.vertraulich) or current_rolle() in ('admin', 'vermittler')
    then a.firma_id else null end as firma_id,
  a.flaeche_min,
  a.flaeche_max,
  a.ort,
  case when (not a.vertraulich) or current_rolle() in ('admin', 'vermittler')
    then a.budget_pro_m2 else null end as budget_pro_m2,
  a.bezug,
  a.nutzung,
  a.anforderungen,
  a.status,
  a.vertraulich,
  a.letzter_kontakt,
  a.created_at
from anfragen a;
