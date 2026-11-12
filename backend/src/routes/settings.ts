import { Router } from "express";
import { z } from "zod";
import type { SupabaseClient, User } from "@supabase/supabase-js";

const router = Router();
const profileSchema = z.object({
  full_name: z.string().trim().min(1).max(100),
  default_currency: z.string().regex(/^[A-Z]{3}$/),
});
const importRowSchema = z.object({
  account_name: z.string().trim().min(1).max(80),
  currency: z.string().regex(/^[A-Z]{3}$/),
  transaction_type: z.enum(["income", "expense"]),
  amount: z.number().finite().positive(),
  category: z.string().trim().min(1).max(80),
  description: z.string().trim().max(240),
  transaction_date: z.string().regex(/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/),
});
const importSchema = z.object({
  rows: z.array(importRowSchema).min(1).max(5000),
  source_file: z.string().trim().max(255).optional(),
});

function context(res: import("express").Response) {
  return { supabase: res.locals.supabase as SupabaseClient, user: res.locals.user as User };
}
function fingerprint(row: { account_id: string; transaction_type: string; amount: number; category: string | null; description: string | null; transaction_date: string }) {
  return [row.account_id, row.transaction_type, Number(row.amount).toFixed(2), row.category ?? "", row.description ?? "", row.transaction_date].join("|").toLowerCase();
}

router.get("/profile", async (_req, res) => {
  const { supabase, user } = context(res);
  const { data, error } = await supabase.from("profiles")
    .select("full_name, default_currency").eq("id", user.id).maybeSingle();
  if (error || !data) {
    res.status(error ? 500 : 404).json({ error: "Unable to load profile settings.", details: error?.message });
    return;
  }
  res.json({ profile: data });
});

router.put("/profile", async (req, res) => {
  const parsed = profileSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid profile settings.", details: parsed.error.flatten() });
    return;
  }
  const { supabase, user } = context(res);
  const { data, error } = await supabase.from("profiles").update(parsed.data)
    .eq("id", user.id).select("full_name, default_currency").maybeSingle();
  if (error || !data) {
    res.status(error ? 400 : 404).json({ error: "Unable to save profile settings.", details: error?.message });
    return;
  }
  const { error: activityError } = await supabase.from("activity_logs").insert({
    user_id: user.id, action: "profile.updated", entity_type: "profile", details: parsed.data,
  });
  if (activityError) console.error("Unable to write profile activity:", activityError.message);
  res.json({ profile: data });
});

router.get("/backup", async (_req, res) => {
  const { supabase, user } = context(res);
  const tables = ["profiles", "accounts", "transactions", "budgets", "savings_goals", "loans", "loan_payments", "subscriptions", "subscription_payments", "activity_logs"] as const;
  const data: Record<string, unknown[]> = {};
  for (const table of tables) {
    const ownerColumn = table === "profiles" ? "id" : "user_id";
    const rows: Record<string, unknown>[] = [];
    let offset = 0;
    while (true) {
      const { data: page, error } = await supabase.from(table).select("*")
        .eq(ownerColumn, user.id).range(offset, offset + 999);
      if (error) {
        res.status(500).json({ error: "Unable to export " + table + ".", details: error.message });
        return;
      }
      rows.push(...(page ?? []));
      if (!page || page.length < 1000) break;
      offset += 1000;
    }
    data[table] = rows;
  }
  res.json({ backup: {
    format: "BudgetNest backup", version: 1, exported_at: new Date().toISOString(),
    user_id: user.id, data,
  } });
});

router.post("/transactions/import", async (req, res) => {
  const parsed = importSchema.safeParse(req.body);
  if (!parsed.success) {
    const issues = parsed.error.issues.map(issue => {
      const rowIndex = typeof issue.path[1] === "number" ? issue.path[1] : undefined;
      const field = typeof issue.path[2] === "string" ? issue.path[2] : undefined;
      return { row: rowIndex === undefined ? undefined : rowIndex + 2, field, message: issue.message };
    });
    res.status(400).json({ error: "Some CSV rows contain invalid values.", details: parsed.error.flatten(), issues });
    return;
  }
  const { supabase, user } = context(res);
  const { data: accountRows, error: accountError } = await supabase.from("accounts")
    .select("id, name, currency, is_archived").eq("user_id", user.id);
  if (accountError) {
    res.status(500).json({ error: "Unable to verify accounts.", details: accountError.message });
    return;
  }
  const { data: existingRows, error: existingError } = await supabase.from("transactions")
    .select("account_id, transaction_type, amount, category, description, transaction_date")
    .eq("user_id", user.id);
  if (existingError) {
    res.status(500).json({ error: "Unable to check existing transactions.", details: existingError.message });
    return;
  }
  const seen = new Set((existingRows ?? []).map(row => fingerprint({ ...row, amount: Number(row.amount) })));
  const inserts: Record<string, unknown>[] = [];
  let skipped = 0;
  for (let index = 0; index < parsed.data.rows.length; index++) {
    const row = parsed.data.rows[index];
    const account = (accountRows ?? []).find(item =>
      item.name.toLowerCase() === row.account_name.toLowerCase() &&
      item.currency === row.currency && !item.is_archived
    );
    if (!account) {
      res.status(400).json({
        error: "Some CSV rows could not be matched to an active account.",
        issues: [{ row: index + 2, field: "account_name", message: "Active account not found for " + row.account_name + " (" + row.currency + "). Create or restore the account first." }],
      });
      return;
    }
    const date = new Date(row.transaction_date + "T00:00:00.000Z");
    if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== row.transaction_date) {
      res.status(400).json({
        error: "Some CSV rows contain invalid dates.",
        issues: [{ row: index + 2, field: "transaction_date", message: "Enter a real calendar date in YYYY-MM-DD format." }],
      });
      return;
    }
    const value = {
      account_id: account.id, transaction_type: row.transaction_type, amount: row.amount,
      category: row.category, description: row.description || null, transaction_date: row.transaction_date,
    };
    const key = fingerprint(value);
    if (seen.has(key)) { skipped++; continue; }
    seen.add(key);
    inserts.push({ ...value, user_id: user.id, transfer_group_id: null, transfer_direction: null });
  }
  for (let offset = 0; offset < inserts.length; offset += 100) {
    const { error } = await supabase.from("transactions").insert(inserts.slice(offset, offset + 100));
    if (error) {
      res.status(400).json({ error: "Import stopped after " + offset + " new rows.", details: error.message });
      return;
    }
  }
  const { error: activityError } = await supabase.from("activity_logs").insert({
    user_id: user.id, action: "data.transactions_imported", entity_type: "transaction",
    details: { imported: inserts.length, skipped_duplicates: skipped, source_file: parsed.data.source_file ?? null },
  });
  if (activityError) console.error("Unable to write import activity:", activityError.message);
  res.json({ imported: inserts.length, skipped_duplicates: skipped });
});

export default router;
