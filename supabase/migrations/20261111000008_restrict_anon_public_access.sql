-- BudgetNest is a signed-in personal finance application.
-- Anonymous visitors must not receive table or function privileges in public.
-- Authenticated access remains governed by the existing owner-scoped RLS policies.

revoke all privileges on all tables in schema public from anon;
revoke execute on all functions in schema public from public, anon, authenticated;

-- Keep future public-schema objects locked down by default as well.
alter default privileges for role postgres in schema public
  revoke all privileges on tables from anon;

alter default privileges for role postgres in schema public
  revoke execute on functions from public, anon, authenticated;
