-- Kritischer Fund (M1 Whole-Branch-Review): Jede eingeloggte Rolle konnte
-- anfragen direkt lesen, wodurch die Maskierung in anfragen_sichtbar komplett
-- umgangen werden konnte. Die Basistabelle muss selbst einschränken; die View
-- ist eine Bequemlichkeit, keine Sicherheitsgrenze.
drop policy "eingeloggt liest anfragen" on anfragen;
create policy "vermittler liest anfragen" on anfragen for select
  to authenticated
  using (current_rolle() in ('admin', 'vermittler'));

-- security_invoker zurück auf false: die View braucht jetzt ihre eigene
-- Sichtbarkeits-Wache (WHERE auth.role() = 'authenticated'), weil leser
-- sonst durch die neue, strengere Basis-Policy auch in der View nichts mehr
-- sähe. security_barrier verhindert, dass der Planer WHERE-Bedingungen der
-- aufrufenden Query vor die Sicherheitsprüfung der View zieht.
create or replace view anfragen_sichtbar
with (security_invoker = false, security_barrier = true)
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
from anfragen a
where auth.role() = 'authenticated';

-- current_rolle() ist SECURITY DEFINER und trägt jede Rollenprüfung im
-- System — ein fester search_path verhindert, dass ein späteres Schema mit
-- CREATE-Recht die Funktion durch eine gleichnamige Relation kapern könnte
-- (heute nicht ausnutzbar, aber eine fragile ambiente Annahme).
alter function current_rolle() set search_path = public, pg_temp;
revoke execute on function current_rolle() from anon;

-- Wertebereiche, die das README vorgibt, aber bisher nicht erzwungen wurden.
alter table matches add constraint matches_score_range check (score between 0 and 100);
alter table profiles add constraint profiles_freigabe_stufe_range check (freigabe_stufe between 1 and 3);
