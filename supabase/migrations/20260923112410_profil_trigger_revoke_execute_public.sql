-- Korrektur: "revoke ... from anon, authenticated" greift nicht, weil diese
-- Rollen nie einen individuellen GRANT hatten -- der Zugriff kommt aus dem
-- impliziten PUBLIC-Grant (Postgres vergibt EXECUTE standardmaessig an PUBLIC,
-- und jede Rolle ist Mitglied von PUBLIC). Erst ein Entzug von PUBLIC selbst
-- schliesst die von PostgREST exponierte RPC-Route.
revoke execute on function handle_new_user() from public;
