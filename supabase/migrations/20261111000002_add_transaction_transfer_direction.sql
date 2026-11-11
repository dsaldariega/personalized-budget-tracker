-- Support paired, account-to-account transfers.
-- Each transfer is stored as two rows sharing transfer_group_id: one outflow and one inflow.
alter table public.transactions
  add column transfer_direction text;

alter table public.transactions
  add constraint transactions_transfer_direction_check
  check (
    (transaction_type = 'transfer' and transfer_direction in ('in', 'out'))
    or (transaction_type <> 'transfer' and transfer_direction is null)
  );

alter table public.transactions
  add constraint transactions_transfer_group_check
  check (
    (transaction_type = 'transfer' and transfer_group_id is not null)
    or (transaction_type <> 'transfer' and transfer_group_id is null)
  );

create index transactions_transfer_group_idx
  on public.transactions(transfer_group_id)
  where transfer_group_id is not null;
