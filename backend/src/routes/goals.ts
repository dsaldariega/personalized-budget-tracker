import { Router } from "express";
import { z } from "zod";
import type { SupabaseClient, User } from "@supabase/supabase-js";

const router = Router();
const goalSchema = z.object({
  account_id: z.string().uuid(),
  name: z.string().trim().min(1).max(100),
  target_amount: z.number().finite().positive().max(999999999999.99),
  current_amount: z.number().finite().min(0).max(999999999999.99),
  target_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  status: z.enum(["active", "completed", "paused"]),
}).refine(v => v.current_amount <= v.target_amount, {
  message: "The saved amount cannot exceed the target amount.",
  path: ["current_amount"],
});
const statusSchema = z.object({ status: z.enum(["active", "completed", "paused"]) });

function context(res: import("express").Response) {
  return { supabase: res.locals.supabase as SupabaseClient, user: res.locals.user as User };
}
async function logActivity(supabase: SupabaseClient, userId: string, action: string, entityId: string | null, details: Record<string, unknown>) {
  const { error } = await supabase.from("activity_logs").insert({ user_id: userId, action, entity_type: "savings_goal", entity_id: entityId, details });
  if (error) console.error("Unable to write savings goal activity log:", error.message);
}
async function accountIsAvailable(supabase: SupabaseClient, userId: string, accountId: string, allowArchived = false) {
  let query = supabase.from("accounts").select("id,is_archived").eq("id", accountId).eq("user_id", userId);
  if (!allowArchived) query = query.eq("is_archived", false);
  const { data, error } = await query.maybeSingle();
  return { available: Boolean(data), error };
}
router.get("/", async (_req, res) => {
  const { supabase, user } = context(res);
  const [accounts, goals] = await Promise.all([
    supabase.from("accounts").select("id,name,currency,is_archived").eq("user_id", user.id).order("name"),
    supabase.from("savings_goals").select("id,user_id,account_id,name,target_amount,current_amount,target_date,status,created_at").eq("user_id", user.id).order("created_at", { ascending: false }),
  ]);
  const failure = accounts.error ?? goals.error;
  if (failure) { res.status(500).json({ error: "Unable to load savings goals.", details: failure.message }); return; }
  res.json({ accounts: accounts.data ?? [], goals: goals.data ?? [] });
});
router.post("/", async (req, res) => {
  const parsed = goalSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid savings goal details.", details: parsed.error.flatten() }); return; }
  const { supabase, user } = context(res);
  const account = await accountIsAvailable(supabase, user.id, parsed.data.account_id);
  if (account.error) { res.status(500).json({ error: "Unable to verify the selected account.", details: account.error.message }); return; }
  if (!account.available) { res.status(400).json({ error: "Choose an active account that belongs to you." }); return; }
  const payload = { ...parsed.data, user_id: user.id, status: parsed.data.current_amount >= parsed.data.target_amount ? "completed" : parsed.data.status };
  const { data, error } = await supabase.from("savings_goals").insert(payload)
    .select("id,user_id,account_id,name,target_amount,current_amount,target_date,status,created_at").single();
  if (error) { res.status(400).json({ error: "Unable to create savings goal.", details: error.message }); return; }
  await logActivity(supabase, user.id, "goal.created", data.id, { name: data.name, target_amount: Number(data.target_amount), current_amount: Number(data.current_amount), status: data.status });
  res.status(201).json({ goal: data });
});
router.put("/:id", async (req, res) => {
  const parsed = goalSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid savings goal details.", details: parsed.error.flatten() }); return; }
  const { supabase, user } = context(res);
  const { data: existing, error: lookupError } = await supabase.from("savings_goals").select("id,account_id").eq("id", req.params.id).eq("user_id", user.id).maybeSingle();
  if (lookupError || !existing) { res.status(lookupError ? 500 : 404).json({ error: "Savings goal not found.", details: lookupError?.message }); return; }
  const account = await accountIsAvailable(supabase, user.id, parsed.data.account_id, existing.account_id === parsed.data.account_id);
  if (account.error) { res.status(500).json({ error: "Unable to verify the selected account.", details: account.error.message }); return; }
  if (!account.available) { res.status(400).json({ error: "Choose an active account that belongs to you." }); return; }
  const payload = { ...parsed.data, status: parsed.data.current_amount >= parsed.data.target_amount ? "completed" : parsed.data.status };
  const { data, error } = await supabase.from("savings_goals").update(payload).eq("id", existing.id).eq("user_id", user.id)
    .select("id,user_id,account_id,name,target_amount,current_amount,target_date,status,created_at").maybeSingle();
  if (error || !data) { res.status(error ? 400 : 404).json({ error: "Unable to update savings goal.", details: error?.message }); return; }
  await logActivity(supabase, user.id, "goal.updated", data.id, { name: data.name, target_amount: Number(data.target_amount), current_amount: Number(data.current_amount), status: data.status });
  res.json({ goal: data });
});
router.patch("/:id/status", async (req, res) => {
  const parsed = statusSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid savings goal status.", details: parsed.error.flatten() }); return; }
  const { supabase, user } = context(res);
  const { data, error } = await supabase.from("savings_goals").update({ status: parsed.data.status }).eq("id", req.params.id).eq("user_id", user.id)
    .select("id,user_id,account_id,name,target_amount,current_amount,target_date,status,created_at").maybeSingle();
  if (error || !data) { res.status(error ? 400 : 404).json({ error: "Unable to update savings goal status.", details: error?.message }); return; }
  await logActivity(supabase, user.id, "goal.status_updated", data.id, { name: data.name, status: parsed.data.status });
  res.json({ goal: data });
});
router.delete("/:id", async (req, res) => {
  const { supabase, user } = context(res);
  const { data: existing, error: lookupError } = await supabase.from("savings_goals").select("id,name").eq("id", req.params.id).eq("user_id", user.id).maybeSingle();
  if (lookupError || !existing) { res.status(lookupError ? 500 : 404).json({ error: "Savings goal not found.", details: lookupError?.message }); return; }
  const { error } = await supabase.from("savings_goals").delete().eq("id", existing.id).eq("user_id", user.id);
  if (error) { res.status(400).json({ error: "Unable to delete savings goal.", details: error.message }); return; }
  await logActivity(supabase, user.id, "goal.deleted", existing.id, { name: existing.name });
  res.status(204).end();
});
export default router;
