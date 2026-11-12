import { Router } from "express";
import { z } from "zod";
import type { SupabaseClient, User } from "@supabase/supabase-js";

const router = Router();

const transactionSchema = z.object({
  account_id: z.string().uuid(),
  transaction_type: z.enum(["income", "expense"]),
  amount: z.number().finite().positive(),
  category: z.string().trim().min(1).max(80),
  description: z.string().trim().max(240).nullable(),
  transaction_date: z.string().regex(/^\\d{4}-\\d{2}-\\d{2}$/),
});

const transferSchema = z.object({
  account_id: z.string().uuid(),
  destination_account_id: z.string().uuid(),
  amount: z.number().finite().positive(),
  description: z.string().trim().max(240).nullable(),
  transaction_date: z.string().regex(/^\\d{4}-\\d{2}-\\d{2}$/),
});

function context(res: import("express").Response) {
  return {
    supabase: res.locals.supabase as SupabaseClient,
    user: res.locals.user as User,
  };
}

async function logActivity(
  supabase: SupabaseClient,
  userId: string,
  action: string,
  entityId: string | null,
  details: Record<string, unknown>,
) {
  const { error } = await supabase.from("activity_logs").insert({
    user_id: userId,
    action,
    entity_type: "transaction",
    entity_id: entityId,
    details,
  });
  if (error) console.error("Unable to write transaction activity log:", error.message);
}

async function getActiveAccounts(supabase: SupabaseClient, userId: string, ids: string[]) {
  const { data, error } = await supabase.from("accounts")
    .select("id, name, currency, opening_balance, is_archived")
    .eq("user_id", userId)
    .in("id", ids)
    .eq("is_archived", false);
  if (error) return { accounts: null, error };
  return { accounts: data ?? [], error: null };
}

router.get("/", async (_req, res) => {
  const { supabase, user } = context(res);
  const [accountResult, transactionResult] = await Promise.all([
    supabase.from("accounts")
      .select("id, name, currency, opening_balance, is_archived")
      .eq("user_id", user.id)
      .order("name"),
    supabase.from("transactions")
      .select("id, user_id, account_id, transaction_type, amount, category, description, transaction_date, transfer_group_id, transfer_direction, created_at")
      .eq("user_id", user.id)
      .order("transaction_date", { ascending: false })
      .order("created_at", { ascending: false }),
  ]);

  const failure = accountResult.error ?? transactionResult.error;
  if (failure) {
    res.status(500).json({ error: "Unable to load transactions.", details: failure.message });
    return;
  }

  res.json({
    accounts: accountResult.data ?? [],
    transactions: transactionResult.data ?? [],
  });
});

router.post("/", async (req, res) => {
  const parsed = transactionSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid transaction details.", details: parsed.error.flatten() });
    return;
  }

  const { supabase, user } = context(res);
  const accountResult = await getActiveAccounts(supabase, user.id, [parsed.data.account_id]);
  if (accountResult.error) {
    res.status(500).json({ error: "Unable to verify the selected account.", details: accountResult.error.message });
    return;
  }
  if (!accountResult.accounts?.some((account) => account.id === parsed.data.account_id)) {
    res.status(400).json({ error: "Choose an active account that belongs to you." });
    return;
  }

  const { data, error } = await supabase.from("transactions")
    .insert({ ...parsed.data, user_id: user.id, transfer_group_id: null, transfer_direction: null })
    .select("id, user_id, account_id, transaction_type, amount, category, description, transaction_date, transfer_group_id, transfer_direction, created_at")
    .single();

  if (error) {
    res.status(400).json({ error: "Unable to create transaction.", details: error.message });
    return;
  }

  await logActivity(supabase, user.id, "transaction.created", data.id, {
    transaction_type: data.transaction_type, amount: Number(data.amount), category: data.category,
  });
  res.status(201).json({ transaction: data });
});

router.post("/transfer", async (req, res) => {
  const parsed = transferSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid transfer details.", details: parsed.error.flatten() });
    return;
  }

  const { supabase, user } = context(res);
  const { account_id, destination_account_id, amount, description, transaction_date } = parsed.data;
  if (account_id === destination_account_id) {
    res.status(400).json({ error: "Source and destination accounts must be different." });
    return;
  }

  const accountResult = await getActiveAccounts(supabase, user.id, [account_id, destination_account_id]);
  if (accountResult.error) {
    res.status(500).json({ error: "Unable to verify the selected accounts.", details: accountResult.error.message });
    return;
  }
  const source = accountResult.accounts?.find((account) => account.id === account_id);
  const destination = accountResult.accounts?.find((account) => account.id === destination_account_id);
  if (!source || !destination) {
    res.status(400).json({ error: "Choose active source and destination accounts that belong to you." });
    return;
  }
  if (source.currency !== destination.currency) {
    res.status(400).json({ error: "Transfers between different currencies are not supported yet. Use accounts with the same currency." });
    return;
  }

  const transferGroupId = crypto.randomUUID();
  const { data, error } = await supabase.from("transactions").insert([
    {
      user_id: user.id, account_id, transaction_type: "transfer", amount,
      category: null, description, transaction_date,
      transfer_group_id: transferGroupId, transfer_direction: "out",
    },
    {
      user_id: user.id, account_id: destination_account_id, transaction_type: "transfer", amount,
      category: null, description, transaction_date,
      transfer_group_id: transferGroupId, transfer_direction: "in",
    },
  ]).select("id, user_id, account_id, transaction_type, amount, category, description, transaction_date, transfer_group_id, transfer_direction, created_at");

  if (error) {
    res.status(400).json({ error: "Unable to create transfer.", details: error.message });
    return;
  }

  const primary = data?.find((item) => item.transfer_direction === "out") ?? data?.[0];
  await logActivity(supabase, user.id, "transaction.created", primary?.id ?? null, {
    transaction_type: "transfer", amount, transfer_group_id: transferGroupId,
    source_account_id: account_id, destination_account_id,
  });
  res.status(201).json({ transactions: data ?? [] });
});

router.put("/:id", async (req, res) => {
  const parsed = transactionSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid transaction details.", details: parsed.error.flatten() });
    return;
  }

  const { supabase, user } = context(res);
  const accountResult = await getActiveAccounts(supabase, user.id, [parsed.data.account_id]);
  if (accountResult.error) {
    res.status(500).json({ error: "Unable to verify the selected account.", details: accountResult.error.message });
    return;
  }
  if (!accountResult.accounts?.some((account) => account.id === parsed.data.account_id)) {
    res.status(400).json({ error: "Choose an active account that belongs to you." });
    return;
  }

  const { data, error } = await supabase.from("transactions")
    .update(parsed.data)
    .eq("id", req.params.id)
    .eq("user_id", user.id)
    .neq("transaction_type", "transfer")
    .select("id, user_id, account_id, transaction_type, amount, category, description, transaction_date, transfer_group_id, transfer_direction, created_at")
    .maybeSingle();

  if (error || !data) {
    res.status(error ? 400 : 404).json({ error: "Unable to update transaction.", details: error?.message });
    return;
  }

  await logActivity(supabase, user.id, "transaction.updated", data.id, {
    transaction_type: data.transaction_type, amount: Number(data.amount), category: data.category,
  });
  res.json({ transaction: data });
});

router.delete("/:id", async (req, res) => {
  const { supabase, user } = context(res);
  const { data: existing, error: lookupError } = await supabase.from("transactions")
    .select("id, transaction_type, amount, category, transfer_group_id")
    .eq("id", req.params.id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (lookupError || !existing) {
    res.status(lookupError ? 500 : 404).json({ error: "Transaction not found.", details: lookupError?.message });
    return;
  }

  let deleteQuery = supabase.from("transactions").delete().eq("user_id", user.id);
  deleteQuery = existing.transfer_group_id
    ? deleteQuery.eq("transfer_group_id", existing.transfer_group_id)
    : deleteQuery.eq("id", existing.id);
  const { error } = await deleteQuery;

  if (error) {
    res.status(400).json({ error: "Unable to delete transaction.", details: error.message });
    return;
  }

  await logActivity(supabase, user.id, "transaction.deleted", existing.id, {
    transaction_type: existing.transaction_type, amount: Number(existing.amount),
    category: existing.category, transfer: Boolean(existing.transfer_group_id),
  });
  res.status(204).end();
});

export default router;
