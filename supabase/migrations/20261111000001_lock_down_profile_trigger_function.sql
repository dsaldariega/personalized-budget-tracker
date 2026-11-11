-- The profile bootstrap function is only intended to run from the auth.users trigger.
-- Do not expose it as an RPC callable by API roles.
revoke all on function public.handle_new_user() from public;
revoke all on function public.handle_new_user() from anon;
revoke all on function public.handle_new_user() from authenticated;
grant execute on function public.handle_new_user() to postgres;
