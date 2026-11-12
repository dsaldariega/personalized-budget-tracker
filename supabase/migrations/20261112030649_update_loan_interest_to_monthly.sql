-- Store loan interest as a monthly percentage and mark historical payment allocations.
-- Existing annual percentages are converted to their equivalent monthly rate.
alter table public.loans
  rename column annual_interest_rate to monthly_interest_rate;

update public.loans
set monthly_interest_rate = round(monthly_interest_rate / 12, 6);

alter table public.loan_payments
  add column allocation_method text not null default 'manual';

alter table public.loan_payments
  add constraint loan_payments_allocation_method_check
  check (allocation_method in ('manual', 'automatic'));
