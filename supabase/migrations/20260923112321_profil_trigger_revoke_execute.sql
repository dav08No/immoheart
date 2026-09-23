-- Nachtrag zu profil_trigger: EXECUTE auf handle_new_user() fuer anon/authenticated
-- entziehen (Supabase-Security-Advisor "anon/authenticated_security_definer_function_executable"),
-- analog zu current_rolle() in 20260923033041_rls_fix_base_table_read.sql.
revoke execute on function handle_new_user() from anon, authenticated;
