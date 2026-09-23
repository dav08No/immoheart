-- current_rolle() wird von RLS-Policies als "authenticated" ausgefuehrt und
-- braucht dafuer EXECUTE; nur der implizite PUBLIC-Grant (den "revoke ...
-- from anon" faelschlich nicht entfernt, siehe M3 handle_new_user()-Fix)
-- soll geschlossen werden.
revoke execute on function current_rolle() from public;
grant execute on function current_rolle() to authenticated;
