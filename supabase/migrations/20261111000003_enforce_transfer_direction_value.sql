alter table public.transactions
  drop constraint transactions_transfer_direction_check;

alter table public.transactions
  add constraint transactions_transfer_direction_check
  check (
    (transaction_type = 'transfer' and transfer_direction is not null and transfer_direction in ('in', 'out'))
    or (transaction_type <> 'transfer' and transfer_direction is null)
  );
