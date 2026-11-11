import type { NextFunction, Request, Response } from "express";
import { createClient } from "@supabase/supabase-js";

export async function authenticate(req: Request, res: Response, next: NextFunction) {
  const authorization = req.header("authorization");
  const token = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];

  if (!token) {
    res.status(401).json({ error: "Authentication is required." });
    return;
  }

  const url = process.env.SUPABASE_URL;
  const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;

  if (!url || !publishableKey) {
    res.status(503).json({ error: "The API authentication service is not configured." });
    return;
  }

  try {
    const supabase = createClient(url, publishableKey, {
      auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user) {
      res.status(401).json({ error: "Your session is invalid or expired. Please sign in again." });
      return;
    }

    res.locals.supabase = supabase;
    res.locals.user = data.user;
    next();
  } catch {
    res.status(401).json({ error: "Unable to verify your session. Please sign in again." });
  }
}
