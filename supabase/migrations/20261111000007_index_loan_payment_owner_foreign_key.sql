-- Support the composite loan ownership foreign key and cascading loan deletes.
create index if not exists loan_payments_loan_user_idx
  on public.loan_payments (loan_id, user_id);
