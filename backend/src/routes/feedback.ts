import { Router } from "express";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient, User } from "@supabase/supabase-js";

const router = Router();
const feedbackSchema = z.object({
  subject: z.string().trim().min(3).max(120),
  category: z.enum(["bug", "idea", "other"]),
  message: z.string().trim().min(10).max(2000),
});

function context(res: import("express").Response) {
  return { supabase: res.locals.supabase as SupabaseClient, user: res.locals.user as User };
}

router.get("/admin", async (_req, res) => {
  const { user } = context(res);
  if (user.email?.trim().toLowerCase() !== "dsaldariega@gmail.com") {
    res.status(403).json({ error: "You are not authorized to view user feedback." });
    return;
  }
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    res.status(503).json({ error: "The feedback management service is not configured." });
    return;
  }
  try {
    const admin = createClient(url, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
    });
    const feedback: {
      id: string; username: string | null; email: string | null; subject: string;
      category: "bug" | "idea" | "other"; message: string; created_at: string;
    }[] = [];
    const pageSize = 1000;
    for (let offset = 0; ; offset += pageSize) {
      const { data, error } = await admin.from("user_feedback")
        .select("id,username,email,subject,category,message,created_at")
        .order("created_at", { ascending: false })
        .range(offset, offset + pageSize - 1);
      if (error) {
        console.error("BudgetNest feedback retrieval failed:", error.message);
        res.status(500).json({ error: "User feedback could not be loaded. Please try again." });
        return;
      }
      const page = data ?? [];
      feedback.push(...page);
      if (page.length < pageSize) break;
    }
    res.setHeader("Cache-Control", "no-store");
    res.json({ feedback });
  } catch (error) {
    console.error("BudgetNest feedback retrieval failed:", error);
    res.status(500).json({ error: "User feedback could not be loaded. Please try again." });
  }
});

router.post("/", async (req, res) => {
  const parsed = feedbackSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: "Enter a subject (3–120 characters), choose a feedback type, and provide a message between 10 and 2,000 characters.",
      details: parsed.error.flatten(),
    });
    return;
  }

  const { supabase, user } = context(res);
  if (!user.email) {
    res.status(400).json({ error: "Your authenticated account does not have an email address." });
    return;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", user.id)
    .maybeSingle();

  const username =
    profile?.username ??
    (typeof user.user_metadata?.username === "string" ? user.user_metadata.username : null) ??
    user.email.split("@")[0];
  const submittedAt = new Date().toISOString();

  const { error: insertError } = await supabase.from("user_feedback").insert({
    user_id: user.id,
    username,
    email: user.email,
    subject: parsed.data.subject,
    category: parsed.data.category,
    message: parsed.data.message,
    created_at: submittedAt,
  });

  if (insertError) {
    console.error("BudgetNest feedback submission failed:", insertError.message);
    res.status(500).json({ error: "Your feedback could not be saved. Please try again." });
    return;
  }

  res.status(201).json({
    message: "Thank you! Your feedback has been submitted successfully.",
  });
});

export default router;
