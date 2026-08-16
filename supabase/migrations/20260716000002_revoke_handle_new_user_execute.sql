-- handle_new_user() must stay SECURITY DEFINER so the auth.users signup trigger
-- can write to public.profiles. It does NOT need to be directly callable via
-- the PostgREST RPC endpoint by client roles. The default PUBLIC grant is what
-- exposes it to anon/authenticated, so drop it and grant explicitly to the roles
-- that actually fire the trigger (GoTrue inserts as supabase_auth_admin) plus
-- service_role for admin-created users.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
grant execute on function public.handle_new_user() to supabase_auth_admin, service_role, postgres;
