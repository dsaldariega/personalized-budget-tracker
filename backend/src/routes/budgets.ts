import { Router } from "express";
import { z } from "zod";
import type { SupabaseClient, User } from "@supabase/supabase-js";

const router = Router();

const budgetSchema = z.object({
  account_id: z.string().uuid(),
  name: z.string().trim().min(1).max(100),
  category: z.string().trim().min(1).max(80),
  amount: z.number().finite().positive().max(999999999999.99),
  period: z.enum(["weekly", "monthly", "yearly", "custom"]),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
}).refine((value) => !value.end_date || value.end_date >= value.start_date, {
  message: "The end date cannot be before the start date.",
  path: ["end_date"],
}).refine((value) => value.period !== "custom" || Boolean(value.end_date), {
  message: "Custom budgets require an end date.",
  path: ["end_date"],
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
    entity_type: "budget",
    entity_id: entityId,
    details,
  });
  if (error) console.error("Unable to write budget activity log:", error.message);
}

async function accountIsAvailable(
  supabase: SupabaseClient,
  userId: string,
  accountId: string,
  allowArchived = false,
) {
  let query = supabase.from("accounts")
    .select("id, is_archived")
    .eq("id", accountId)
    .eq("user_id", userId);
  if (!allowArchived) query = query.eq("is_archived", false);
  const { data, error } = await query.maybeSingle();
  return { available: Boolean(data), error };
}

router.get("/", async (_req, res) => {
  const { supabase, user } = context(res);
  const [accountResult, budgetResult, expenseResult] = await Promise.all([
    supabase.from("accounts")
      .select("id, name, currency, is_archived")
      .eq("user_id", user.id)
      .order("name"),
    supabase.from("budgets")
      .select("id, user_id, account_id, name, category, amount, period, start_date, end_date, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    supabase.from("transactions")
      .select("account_id, category, amount, transaction_date, transaction_type")
      .eq("user_id", user.id)
      .eq("transaction_type", "expense"),
  ]);

  const failure = accountResult.error ?? budgetResult.error ?? expenseResult.error;
  if (failure) {
    res.status(500).json({ error: "Unable to load budgets.", details: failure.message });
    return;
  }

  res.json({
    accounts: accountResult.data ?? [],
    budgets: budgetResult.data ?? [],
    expenses: expenseResult.data ?? [],
  });
});

router.post("/", async (req, res) => {
  const parsed = budgetSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid budget details.", details: parsed.error.flatten() });
    return;
  }

  const { supabase, user } = context(res);
  const account = await accountIsAvailable(supabase, user.id, parsed.data.account_id);
  if (account.error) {
    res.status(500).json({ error: "Unable to verify the selected account.", details: account.error.message });
    return;
  }
  if (!account.available) {
    res.status(400).json({ error: "Choose an active account that belongs to you." });
    return;
  }

  const { data, error } = await supabase.from("budgets")
    .insert({ ...parsed.data, user_id: user.id })
    .select("id, user_id, account_id, name, category, amount, period, start_date, end_date, created_at")
    .single();

  if (error) {
    res.status(400).json({ error: "Unable to create budget.", details: error.message });
    return;
  }

  await logActivity(supabase, user.id, "budget.created", data.id, {
    name: data.name, category: data.category, amount: Number(data.amount), period: data.period,
  });
  res.status(201).json({ budget: data });
});

router.put("/:id", async (req, res) => {
  const parsed = budgetSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid budget details.", details: parsed.error.flatten() });
    return;
  }

  const { supabase, user } = context(res);
  const { data: existing, error: lookupError } = await supabase.from("budgets")
    .select("id, account_id")
    .eq("id", req.params.id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (lookupError || !existing) {
    res.status(lookupError ? 500 : 404).json({ error: "Budget not found.", details: lookupError?.message });
    return;
  }

  const account = await accountIsAvailable(
    supabase, user.id, parsed.data.account_id,
    existing.account_id === parsed.data.account_id,
  );
  if (account.error) {
    res.status(500).json({ error: "Unable to verify the selected account.", details: account.error.message });
    return;
  }
  if (!account.available) {
    res.status(400).json({ error: "Choose an active account that belongs to you." });
    return;
  }

  const { data, error } = await supabase.from("budgets")
    .update(parsed.data)
    .eq("id", existing.id)
    .eq("user_id", user.id)
    .select("id, user_id, account_id, name, category, amount, period, start_date, end_date, created_at")
    .maybeSingle();

  if (error || !data) {
    res.status(error ? 400 : 404).json({ error: "Unable to update budget.", details: error?.message });
    return;
  }

  await logActivity(supabase, user.id, "budget.updated", data.id, {
    name: data.name, category: data.category, amount: Number(data.amount), period: data.period,
  });
  res.json({ budget: data });
});

router.delete("/:id", async (req, res) => {
  const { supabase, user } = context(res);
  const { data: existing, error: lookupError } = await supabase.from("budgets")
    .select("id, name")
    .eq("id", req.params.id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (lookupError || !existing) {
    res.status(lookupError ? 500 : 404).json({ error: "Budget not found.", details: lookupError?.message });
    return;
  }

  const { error } = await supabase.from("budgets")
    .delete()
    .eq("id", existing.id)
    .eq("user_id", user.id);

  if (error) {
    res.status(400).json({ error: "Unable to delete budget.", details: error.message });
    return;
  }

  await logActivity(supabase, user.id, "budget.deleted", existing.id, { name: existing.name });
  res.status(204).end();
});

export default router;
