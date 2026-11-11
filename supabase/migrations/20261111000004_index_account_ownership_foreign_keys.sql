-- Cover account ownership foreign keys for efficient account deletes/updates
-- and joins across account-linked financial records.
create index if not exists transactions_account_user_idx on public.transactions(account_id, user_id);
create index if not exists budgets_account_user_idx on public.budgets(account_id, user_id);
create index if not exists savings_goals_account_user_idx on public.savings_goals(account_id, user_id);
create index if not exists loans_account_user_idx on public.loans(account_id, user_id);
create index if not exists subscriptions_account_user_idx on public.subscriptions(account_id, user_id);
