import { Router } from "express";
import { z } from "zod";
import type { SupabaseClient, User } from "@supabase/supabase-js";
const router = Router();
const filtersSchema = z.object({
  days: z.coerce.number().int().positive().max(3650).optional(),
  entity_type: z.enum(["account","transaction","budget","goal","loan","subscription","profile"]).optional(),
});
function context(res: import("express").Response) {
  return { supabase: res.locals.supabase as SupabaseClient, user: res.locals.user as User };
}
router.get("/", async (req, res) => {
  const parsed = filtersSchema.safeParse(req.query);
  if (!parsed.success) { res.status(400).json({ error: "Invalid activity filters.", details: parsed.error.flatten() }); return; }
  const { supabase, user } = context(res);
  let query = supabase.from("activity_logs").select("id,action,entity_type,entity_id,details,created_at")
    .eq("user_id", user.id).order("created_at", { ascending: false }).limit(500);
  if (parsed.data.days) { const since = new Date(); since.setDate(since.getDate() - parsed.data.days); query = query.gte("created_at", since.toISOString()); }
  if (parsed.data.entity_type) query = query.eq("entity_type", parsed.data.entity_type);
  const { data, error } = await query;
  if (error) { res.status(500).json({ error: "Unable to load activity.", details: error.message }); return; }
  res.json({ activities: data ?? [] });
});
export default router;
