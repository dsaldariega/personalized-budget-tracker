-- Add owner-scoped repayment records for personal loans.
alter table public.loans add constraint loans_id_user_id_unique unique (id, user_id);

create table public.loan_payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  loan_id uuid not null,
  amount numeric(14,2) not null check (amount > 0),
  principal_paid numeric(14,2) not null check (principal_paid >= 0),
  interest_paid numeric(14,2) not null default 0 check (interest_paid >= 0),
  payment_date date not null default current_date,
  notes text,
  created_at timestamptz not null default now(),
  constraint loan_payments_amount_breakdown_check check (amount = principal_paid + interest_paid),
  constraint loan_payments_loan_owner_fkey foreign key (loan_id, user_id)
    references public.loans(id, user_id) on delete cascade
);

create index loan_payments_user_date_idx on public.loan_payments(user_id, payment_date desc);
create index loan_payments_loan_date_idx on public.loan_payments(loan_id, payment_date desc);

alter table public.loan_payments enable row level security;

create policy "Users manage own loan payments" on public.loan_payments
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
