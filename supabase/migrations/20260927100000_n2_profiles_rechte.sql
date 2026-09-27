-- Profile werden nur über geprüfte Server Actions mit dem Service-Role-Key
-- angelegt, geändert und gelöscht. Eingeloggte Nutzer brauchen nur Lesezugriff
-- (über die RLS-Policy "aktives konto liest profile").
revoke insert, delete, truncate, references, trigger on table profiles from authenticated;
