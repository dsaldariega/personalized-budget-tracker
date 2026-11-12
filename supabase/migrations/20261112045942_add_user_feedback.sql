create table public.user_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null check (category in ('bug', 'idea', 'other')),
  message text not null check (char_length(trim(message)) between 10 and 2000),
  created_at timestamptz not null default now()
);

create index user_feedback_user_created_idx
  on public.user_feedback(user_id, created_at desc);

alter table public.user_feedback enable row level security;

create policy "Users can submit own feedback"
  on public.user_feedback
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);
