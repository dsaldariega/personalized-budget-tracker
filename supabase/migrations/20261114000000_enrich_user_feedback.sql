alter table public.user_feedback
  add column if not exists username text,
  add column if not exists email text,
  add column if not exists subject text;

comment on column public.user_feedback.username is 'Username resolved from the authenticated user profile at submission time.';
comment on column public.user_feedback.email is 'Email address from the verified Supabase Auth user at submission time.';
comment on column public.user_feedback.subject is 'User-provided feedback subject.';
