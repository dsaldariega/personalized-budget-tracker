-- Add username support to profiles so username-based sign-in can resolve
-- Supabase Auth users without relying on user metadata at login time.

alter table public.profiles
  add column if not exists username text;

-- Backfill usernames already collected during registration.
update public.profiles as profile
set username = lower(trim(auth_user.raw_user_meta_data ->> 'username'))
from auth.users as auth_user
where auth_user.id = profile.id
  and profile.username is null
  and coalesce(auth_user.raw_user_meta_data ->> 'username', '') ~* '^[a-z0-9_]{3,24}$';

alter table public.profiles
  add constraint profiles_username_format_check
  check (username is null or username ~ '^[a-z0-9_]{3,24}$');

create unique index profiles_username_lower_unique
  on public.profiles (lower(username))
  where username is not null;

-- Keep the profile row in sync with metadata when a new Auth user is created.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, avatar_url, username)
  values (
    new.id,
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    nullif(new.raw_user_meta_data ->> 'avatar_url', ''),
    nullif(lower(trim(new.raw_user_meta_data ->> 'username')), '')
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

-- This function is invoked by the auth.users trigger, not exposed as an RPC.
revoke all on function public.handle_new_user() from public;
revoke all on function public.handle_new_user() from anon;
revoke all on function public.handle_new_user() from authenticated;
grant execute on function public.handle_new_user() to postgres;
