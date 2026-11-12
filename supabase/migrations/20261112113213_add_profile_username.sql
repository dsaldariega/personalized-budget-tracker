alter table public.profiles
  add column username text;

alter table public.profiles
  add constraint profiles_username_format
  check (username is null or username ~ '^[a-z0-9_]{3,24}$');

create unique index profiles_username_unique
  on public.profiles (lower(username))
  where username is not null;

update public.profiles p
set username = lower(regexp_replace(split_part(u.email, '@', 1), '[^a-zA-Z0-9_]', '', 'g'))
from auth.users u
where u.id = p.id
  and p.username is null;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  insert into public.profiles (id, full_name, avatar_url, username)
  values (
    new.id,
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    nullif(new.raw_user_meta_data ->> 'avatar_url', ''),
    nullif(lower(new.raw_user_meta_data ->> 'username'), '')
  )
  on conflict (id) do update
    set username = coalesce(public.profiles.username, excluded.username);
  return new;
end;
$function$;
