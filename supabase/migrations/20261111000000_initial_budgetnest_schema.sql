-- BudgetNest initial schema
-- Every financial record is scoped to its owner. Account-linked records use
-- composite foreign keys so a user cannot attach data to another user's account.

create extension if not exists pgcrypto;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  default_currency char(3) not null default 'PHP',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (new.id, nullif(new.raw_user_meta_data ->> 'full_name', ''), nullif(new.raw_user_meta_data ->> 'avatar_url', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users
for each row execute procedure public.handle_new_user();

create table public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 80),
  account_type text not null check (account_type in ('cash','bank','e_wallet','credit','investment','other')),
  currency char(3) not null default 'PHP',
  opening_balance numeric(14,2) not null default 0,
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id)
);

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  account_id uuid not null,
  transaction_type text not null check (transaction_type in ('income','expense','transfer')),
  amount numeric(14,2) not null check (amount > 0),
  category text,
  description text,
  transaction_date date not null default current_date,
  transfer_group_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (account_id, user_id) references public.accounts(id, user_id) on delete restrict
);

create table public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  account_id uuid not null,
  name text not null check (char_length(trim(name)) between 1 and 100),
  category text not null,
  amount numeric(14,2) not null check (amount > 0),
  period text not null default 'monthly' check (period in ('weekly','monthly','yearly','custom')),
  start_date date not null default current_date,
  end_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (account_id, user_id) references public.accounts(id, user_id) on delete restrict,
  check (end_date is null or end_date >= start_date)
);

create table public.savings_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  account_id uuid not null,
  name text not null check (char_length(trim(name)) between 1 and 100),
  target_amount numeric(14,2) not null check (target_amount > 0),
  current_amount numeric(14,2) not null default 0 check (current_amount >= 0),
  target_date date,
  status text not null default 'active' check (status in ('active','completed','paused')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (account_id, user_id) references public.accounts(id, user_id) on delete restrict
);

create table public.loans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  account_id uuid not null,
  name text not null check (char_length(trim(name)) between 1 and 100),
  principal_amount numeric(14,2) not null check (principal_amount > 0),
  annual_interest_rate numeric(7,4) not null default 0 check (annual_interest_rate >= 0),
  term_months integer not null check (term_months > 0),
  start_date date not null default current_date,
  due_date date,
  notes text,
  status text not null default 'active' check (status in ('active','paid','paused')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (account_id, user_id) references public.accounts(id, user_id) on delete restrict
);

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  account_id uuid not null,
  name text not null check (char_length(trim(name)) between 1 and 100),
  amount numeric(14,2) not null check (amount > 0),
  billing_frequency text not null check (billing_frequency in ('weekly','monthly','quarterly','yearly')),
  next_billing_date date not null,
  category text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (account_id, user_id) references public.accounts(id, user_id) on delete restrict
);

create table public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  action text not null,
  entity_type text,
  entity_id uuid,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index accounts_user_created_idx on public.accounts(user_id, created_at desc);
create index transactions_user_date_idx on public.transactions(user_id, transaction_date desc);
create index transactions_account_date_idx on public.transactions(account_id, transaction_date desc);
create index budgets_user_period_idx on public.budgets(user_id, start_date, end_date);
create index savings_goals_user_status_idx on public.savings_goals(user_id, status);
create index loans_user_status_idx on public.loans(user_id, status);
create index subscriptions_user_billing_idx on public.subscriptions(user_id, next_billing_date);
create index activity_logs_user_created_idx on public.activity_logs(user_id, created_at desc);

alter table public.profiles enable row level security;
alter table public.accounts enable row level security;
alter table public.transactions enable row level security;
alter table public.budgets enable row level security;
alter table public.savings_goals enable row level security;
alter table public.loans enable row level security;
alter table public.subscriptions enable row level security;
alter table public.activity_logs enable row level security;

create policy "Users can view own profile" on public.profiles for select to authenticated using ((select auth.uid()) = id);
create policy "Users can update own profile" on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
create policy "Users manage own accounts" on public.accounts for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Users manage own transactions" on public.transactions for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Users manage own budgets" on public.budgets for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Users manage own savings goals" on public.savings_goals for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Users manage own loans" on public.loans for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Users manage own subscriptions" on public.subscriptions for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Users can view own activity" on public.activity_logs for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users can add own activity" on public.activity_logs for insert to authenticated with check ((select auth.uid()) = user_id);

create trigger profiles_set_updated_at before update on public.profiles for each row execute procedure public.set_updated_at();
create trigger accounts_set_updated_at before update on public.accounts for each row execute procedure public.set_updated_at();
create trigger transactions_set_updated_at before update on public.transactions for each row execute procedure public.set_updated_at();
create trigger budgets_set_updated_at before update on public.budgets for each row execute procedure public.set_updated_at();
create trigger savings_goals_set_updated_at before update on public.savings_goals for each row execute procedure public.set_updated_at();
create trigger loans_set_updated_at before update on public.loans for each row execute procedure public.set_updated_at();
create trigger subscriptions_set_updated_at before update on public.subscriptions for each row execute procedure public.set_updated_at();
