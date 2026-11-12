"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Alert, Box, Button, Divider, Paper, Stack, TextField, Typography
} from "@mui/material";
import { createClient } from "@/lib/supabase/client";

type AuthMode = "login" | "register";

export function AuthForm({ mode, modal = false }: { mode: AuthMode; modal?: boolean }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "error" | "success" | "info"; text: string } | null>(
    searchParams.get("error") === "configuration"
      ? { type: "info", text: "Supabase is not configured yet. Add your BudgetNest project URL and publishable key to frontend/.env.local." }
      : searchParams.get("error") === "callback"
        ? { type: "error", text: "We couldn't complete sign-in. Please try again." }
        : null
  );

  const isRegister = mode === "register";
  const next = searchParams.get("next");
  const destination = next && next.startsWith("/") && !next.startsWith("//") ? next : "/";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) {
      setMessage({ type: "info", text: "Supabase is not configured yet. Add the project URL and publishable key first." });
      return;
    }

    setLoading(true);
    setMessage(null);

    if (isRegister) {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName.trim() },
          emailRedirectTo: `${window.location.origin}/auth/callback?next=/`
        }
      });

      if (error) {
        setMessage({ type: "error", text: error.message });
      } else if (data.session) {
        router.replace(destination);
        router.refresh();
      } else {
        setMessage({ type: "success", text: "Account created. Check your email to confirm your address before signing in." });
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setMessage({ type: "error", text: error.message });
      } else {
        router.replace(destination);
        router.refresh();
      }
    }

    setLoading(false);
  }


  return (
    <Paper sx={{ width: "100%", maxWidth: 440, p: { xs: 3, sm: 4 }, borderRadius: 4 }}>
      <Stack spacing={2.5}>
        <Box>
          <Typography variant="h4" fontWeight={800} letterSpacing={-1}>
            {isRegister ? "Create your account" : "Welcome back"}
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 1 }}>
            {isRegister ? "Start building a clearer picture of your finances." : "Sign in to pick up where you left off."}
          </Typography>
        </Box>

        {message && <Alert severity={message.type}>{message.text}</Alert>}

        <Divider><Typography variant="caption" color="text.secondary">CONTINUE WITH EMAIL</Typography></Divider>

        <Box component="form" onSubmit={handleSubmit}>
          <Stack spacing={2}>
            {isRegister && (
              <TextField label="Full name" value={fullName} onChange={(event) => setFullName(event.target.value)} autoComplete="name" required fullWidth />
            )}
            <TextField label="Email address" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required fullWidth />
            <TextField label="Password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={isRegister ? "new-password" : "current-password"} inputProps={{ minLength: 8 }} helperText={isRegister ? "Use at least 8 characters." : undefined} required fullWidth />
            <Button type="submit" variant="contained" disableElevation disabled={loading || !supabase} sx={{ py: 1.25, textTransform: "none" }}>
              {loading ? "Please wait…" : isRegister ? "Create account" : "Sign in"}
            </Button>
          </Stack>
        </Box>

        <Typography variant="body2" color="text.secondary" textAlign="center">
          {isRegister ? "Already have an account? " : "New to BudgetNest? "}
          <Box component={Link} href={isRegister ? "/login" : "/register"} sx={{ color: "primary.main", fontWeight: 700 }}>
            {isRegister ? "Sign in" : "Create an account"}
          </Box>
        </Typography>
      </Stack>
    </Paper>
  );
}
