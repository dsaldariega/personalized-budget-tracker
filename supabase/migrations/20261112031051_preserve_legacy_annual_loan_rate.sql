-- Keep the legacy annual-rate column available while main and dev share one database.
-- The new app writes monthly_interest_rate; the older main app still reads/writes annual_interest_rate.
alter table public.loans
  add column annual_interest_rate numeric(7,4) not null default 0
  check (annual_interest_rate >= 0);

update public.loans
set annual_interest_rate = round(monthly_interest_rate * 12, 4);

create or replace function public.sync_loan_interest_rate_columns()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if new.monthly_interest_rate <> 0 then
      new.annual_interest_rate := round(new.monthly_interest_rate * 12, 4);
    else
      new.monthly_interest_rate := round(new.annual_interest_rate / 12, 6);
    end if;
  elsif new.monthly_interest_rate is distinct from old.monthly_interest_rate
    and new.annual_interest_rate is not distinct from old.annual_interest_rate then
    new.annual_interest_rate := round(new.monthly_interest_rate * 12, 4);
  elsif new.annual_interest_rate is distinct from old.annual_interest_rate
    and new.monthly_interest_rate is not distinct from old.monthly_interest_rate then
    new.monthly_interest_rate := round(new.annual_interest_rate / 12, 6);
  elsif new.monthly_interest_rate is distinct from old.monthly_interest_rate
    and new.annual_interest_rate is distinct from old.annual_interest_rate then
    new.annual_interest_rate := round(new.monthly_interest_rate * 12, 4);
  end if;

  return new;
end;
$$;

create trigger sync_loan_interest_rate_columns
before insert or update on public.loans
for each row execute function public.sync_loan_interest_rate_columns();

revoke all on function public.sync_loan_interest_rate_columns() from public, anon, authenticated;
