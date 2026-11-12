import { Router } from "express";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const router = Router();

const loginSchema = z.object({
  identifier: z.string().trim().min(3).max(120),
  password: z.string().min(1).max(200),
});

function normalizeUsername(value: string) {
  return value.trim().toLowerCase();
}

router.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Enter a valid username/email and password." });
    return;
  }

  const url = process.env.SUPABASE_URL;
  const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !publishableKey || !serviceRoleKey) {
    res.status(503).json({ error: "The API authentication service is not configured." });
    return;
  }

  try {
    const admin = createClient(url, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
    });

    let email = parsed.data.identifier;

    if (!email.includes("@")) {
      const { data: profile, error: profileError } = await admin
        .from("profiles")
        .select("id")
        .ilike("username", normalizeUsername(parsed.data.identifier))
        .maybeSingle();

      if (profileError || !profile) {
        res.status(401).json({ error: "Invalid username/email or password." });
        return;
      }

      const { data: userData, error: userError } = await admin.auth.admin.getUserById(profile.id);
      if (userError || !userData.user?.email) {
        res.status(401).json({ error: "Invalid username/email or password." });
        return;
      }

      email = userData.user.email;
    }

    const authClient = createClient(url, publishableKey, {
      auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
    });

    const { data, error } = await authClient.auth.signInWithPassword({
      email,
      password: parsed.data.password,
    });

    if (error || !data.session) {
      res.status(401).json({ error: "Invalid username/email or password." });
      return;
    }

    res.json({
      session: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
      },
    });
  } catch (error) {
    console.error("BudgetNest username login error:", error);
    res.status(401).json({ error: "Unable to sign in. Please try again." });
  }
});

export default router;
