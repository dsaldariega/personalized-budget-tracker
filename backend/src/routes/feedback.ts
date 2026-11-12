import { Router } from "express";
import { z } from "zod";
import type { SupabaseClient, User } from "@supabase/supabase-js";

const router = Router();
const feedbackSchema = z.object({
  category: z.enum(["bug", "idea", "other"]),
  message: z.string().trim().min(10).max(2000),
});

function context(res: import("express").Response) {
  return { supabase: res.locals.supabase as SupabaseClient, user: res.locals.user as User };
}

router.post("/", async (req, res) => {
  const parsed = feedbackSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: "Please choose a feedback type and enter between 10 and 2,000 characters.",
      details: parsed.error.flatten(),
    });
    return;
  }

  const { supabase, user } = context(res);
  const { error } = await supabase.from("user_feedback").insert({
    user_id: user.id,
    category: parsed.data.category,
    message: parsed.data.message,
  });

  if (error) {
    console.error("BudgetNest feedback submission failed:", error.message);
    res.status(500).json({ error: "Your feedback could not be sent. Please try again." });
    return;
  }

  res.status(201).json({ message: "Thanks for helping make BudgetNest better." });
});

export default router;
