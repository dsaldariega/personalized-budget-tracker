-- BudgetNest subscription billing history
-- Keep a record of payments separately from transactions to avoid changing
-- account balances or double-counting expenses.

alter table public.subscriptions
  add constraint subscriptions_id_user_id_unique unique (id, user_id);

alter table public.subscriptions
  add column if not exists notes text;

create table public.subscription_payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subscription_id uuid not null,
  amount numeric(14,2) not null check (amount > 0),
  billing_date date not null,
  paid_date date not null default current_date,
  notes text,
  created_at timestamptz not null default now(),
  foreign key (subscription_id, user_id)
    references public.subscriptions(id, user_id) on delete cascade
);

create index subscription_payments_user_paid_date_idx
  on public.subscription_payments(user_id, paid_date desc);
create index subscription_payments_subscription_date_idx
  on public.subscription_payments(subscription_id, billing_date desc);
create index subscription_payments_subscription_user_idx
  on public.subscription_payments(subscription_id, user_id);

alter table public.subscription_payments enable row level security;

create policy "Users manage own subscription payments"
  on public.subscription_payments
  for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
