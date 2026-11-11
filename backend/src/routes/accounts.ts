import { Router } from "express";
import { z } from "zod";
import type { SupabaseClient, User } from "@supabase/supabase-js";

const router = Router();

const accountSchema = z.object({
  name: z.string().trim().min(1).max(80),
  account_type: z.enum(["cash", "bank", "e_wallet", "credit", "investment", "other"]),
  currency: z.string().trim().regex(/^[A-Za-z]{3}$/).transform((value) => value.toUpperCase()),
  opening_balance: z.number().finite(),
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
    entity_type: "account",
    entity_id: entityId,
    details,
  });
  if (error) console.error("Unable to write account activity log:", error.message);
}

router.get("/", async (_req, res) => {
  const { supabase, user } = context(res);
  const [accountResult, transactionResult, profileResult] = await Promise.all([
    supabase.from("accounts")
      .select("id, name, account_type, currency, opening_balance, is_archived, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    supabase.from("transactions")
      .select("account_id, transaction_type, amount, transfer_direction")
      .eq("user_id", user.id),
    supabase.from("profiles")
      .select("default_currency")
      .eq("id", user.id)
      .maybeSingle(),
  ]);

  const failure = accountResult.error ?? transactionResult.error ?? profileResult.error;
  if (failure) {
    res.status(500).json({ error: "Unable to load accounts.", details: failure.message });
    return;
  }

  res.json({
    accounts: accountResult.data ?? [],
    transactions: transactionResult.data ?? [],
    defaultCurrency: profileResult.data?.default_currency ?? "PHP",
  });
});

router.post("/", async (req, res) => {
  const parsed = accountSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid account details.", details: parsed.error.flatten() });
    return;
  }

  const { supabase, user } = context(res);
  const { data, error } = await supabase.from("accounts")
    .insert({ ...parsed.data, user_id: user.id })
    .select("id, name, account_type, currency, opening_balance, is_archived, created_at")
    .single();

  if (error) {
    res.status(400).json({ error: "Unable to create account.", details: error.message });
    return;
  }

  await logActivity(supabase, user.id, "account.created", data.id, {
    name: data.name, account_type: data.account_type,
  });
  res.status(201).json({ account: data });
});

router.put("/:id", async (req, res) => {
  const parsed = accountSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid account details.", details: parsed.error.flatten() });
    return;
  }

  const { supabase, user } = context(res);
  const { data, error } = await supabase.from("accounts")
    .update(parsed.data)
    .eq("id", req.params.id)
    .eq("user_id", user.id)
    .select("id, name, account_type, currency, opening_balance, is_archived, created_at")
    .maybeSingle();

  if (error || !data) {
    res.status(error ? 400 : 404).json({ error: "Unable to update account.", details: error?.message });
    return;
  }

  await logActivity(supabase, user.id, "account.updated", data.id, {
    name: data.name, account_type: data.account_type,
  });
  res.json({ account: data });
});

router.patch("/:id/archive", async (req, res) => {
  const parsed = z.object({ archived: z.boolean() }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Provide an archived boolean value." });
    return;
  }

  const { supabase, user } = context(res);
  const { data, error } = await supabase.from("accounts")
    .update({ is_archived: parsed.data.archived })
    .eq("id", req.params.id)
    .eq("user_id", user.id)
    .select("id, name, is_archived")
    .maybeSingle();

  if (error || !data) {
    res.status(error ? 400 : 404).json({ error: "Unable to update account status.", details: error?.message });
    return;
  }

  await logActivity(
    supabase, user.id,
    data.is_archived ? "account.archived" : "account.restored",
    data.id, { name: data.name },
  );
  res.json({ account: data });
});

router.delete("/:id", async (req, res) => {
  const { supabase, user } = context(res);
  const { data: existing, error: lookupError } = await supabase.from("accounts")
    .select("id, name")
    .eq("id", req.params.id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (lookupError || !existing) {
    res.status(lookupError ? 400 : 404).json({ error: "Account not found.", details: lookupError?.message });
    return;
  }

  const { error } = await supabase.from("accounts")
    .delete()
    .eq("id", existing.id)
    .eq("user_id", user.id);

  if (error) {
    if (error.code === "23503") {
      res.status(409).json({ error: "This account is linked to financial records and cannot be deleted. Archive it instead." });
      return;
    }
    res.status(400).json({ error: "Unable to delete account.", details: error.message });
    return;
  }

  await logActivity(supabase, user.id, "account.deleted", existing.id, { name: existing.name });
  res.status(204).end();
});

export default router;
