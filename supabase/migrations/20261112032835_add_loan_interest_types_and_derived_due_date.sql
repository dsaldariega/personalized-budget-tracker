alter table public.loans
  add column if not exists interest_type text not null default 'reducing_balance'
  check (interest_type in ('flat_rate', 'reducing_balance'));

update public.loans
set due_date = (start_date + (term_months * interval '1 month'))::date;

comment on column public.loans.interest_type is
  'Loan interest calculation method: flat_rate or reducing_balance';
