import { Router } from "express";
import { z } from "zod";
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

  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.FEEDBACK_FROM_EMAIL;
  const recipient = process.env.FEEDBACK_TO_EMAIL;
  let notificationSent = false;

  if (apiKey && fromEmail && recipient) {
    const safeSubject = parsed.data.subject.replace(/[\r\n]+/g, " ").slice(0, 120);
    const categoryLabel = parsed.data.category === "bug" ? "Bug report" : parsed.data.category === "idea" ? "Feature idea" : "Other feedback";
    const emailText = [
      "A new BudgetNest feedback submission was received.",
      "",
      `Subject: ${safeSubject}`,
      `Category: ${categoryLabel}`,
      `Username: ${username}`,
      `Email: ${user.email}`,
      `User ID: ${user.id}`,
      `Submitted at (UTC): ${submittedAt}`,
      "",
      "Feedback:",
      parsed.data.message,
    ].join("\n");

    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: fromEmail,
          to: [recipient],
          reply_to: user.email,
          subject: `BudgetNest feedback: ${safeSubject}`,
          text: emailText,
        }),
      });
      notificationSent = response.ok;
      if (!response.ok) {
        console.error("BudgetNest feedback email notification failed:", response.status, await response.text());
      }
    } catch (error) {
      console.error("BudgetNest feedback email notification failed:", error);
    }
  } else {
    console.error("BudgetNest feedback email is not configured. Set RESEND_API_KEY, FEEDBACK_FROM_EMAIL, and FEEDBACK_TO_EMAIL.");
  }

  res.status(201).json({
    message: notificationSent
      ? "Thank you! Your feedback has been submitted successfully, and the administrators have been notified."
      : "Thank you! Your feedback has been submitted successfully.",
    notificationSent,
  });
});

export default router;
