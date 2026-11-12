"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Alert, Box, Button, Divider, Paper, Stack, TextField, Typography
} from "@mui/material";
import { createClient } from "@/lib/supabase/client";
import { publicApiRequest } from "@/lib/api";

type AuthMode = "login" | "register";

export function AuthForm({ mode, onAuthenticated }: { mode: AuthMode; modal?: boolean; onAuthenticated?: () => void }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const [identifier, setIdentifier] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
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

    try {
      if (isRegister) {
        const normalizedUsername = username.trim().toLowerCase();
        const normalizedEmail = email.trim().toLowerCase();
        const authEmail = normalizedEmail || `${normalizedUsername}@users.budgetnest.local`;

        const { data, error } = await supabase.auth.signUp({
          email: authEmail,
          password,
          options: {
            data: {
              username: normalizedUsername,
              full_name: fullName.trim(),
            },
          },
        });

        if (error) {
          setMessage({ type: "error", text: error.message });
          return;
        }

        if (data.session) {
          onAuthenticated?.();
          router.replace(destination);
          router.refresh();
          return;
        }

        setMessage({
          type: "success",
          text: "Account created. If email confirmation is enabled in Supabase, confirm the account before signing in.",
        });
      } else if (identifier.includes("@")) {
        const { error } = await supabase.auth.signInWithPassword({
          email: identifier.trim(),
          password,
        });

        if (error) {
          setMessage({ type: "error", text: error.message });
          return;
        }

        onAuthenticated?.();
        router.replace(destination);
        router.refresh();
      } else {
        const data = await publicApiRequest<{ session: { access_token: string; refresh_token: string } }>("/auth/login", {
          method: "POST",
          body: JSON.stringify({ identifier: identifier.trim(), password }),
        });

        const { error } = await supabase.auth.setSession(data.session);
        if (error) {
          setMessage({ type: "error", text: "We couldn't establish your session. Please try again." });
          return;
        }

        onAuthenticated?.();
        router.replace(destination);
        router.refresh();
      }
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Unable to complete the request. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Paper
      elevation={0}
      sx={{
        width: "100%",
        maxWidth: 430,
        p: { xs: 2.5, sm: 3.25 },
        borderRadius: 4,
        border: 1,
        borderColor: "rgba(34, 28, 53, 0.08)",
        bgcolor: "rgba(255,255,255,0.96)",
        boxShadow: "0 24px 70px rgba(34, 28, 53, 0.10)",
      }}
    >
      <Stack spacing={2.1}>
        <Box>
          <Typography variant="h4" fontWeight={800} letterSpacing={-1.2} sx={{ fontSize: { xs: 27, sm: 31 } }}>
            {isRegister ? "Create your account" : "Welcome back"}
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 0.75 }}>
            {isRegister ? "Set up your personal finance space in a minute." : "Sign in to pick up where you left off."}
          </Typography>
        </Box>

        {message && <Alert severity={message.type}>{message.text}</Alert>}

        <Divider>
          <Typography variant="caption" color="text.secondary">
            {isRegister ? "YOUR ACCOUNT" : "SIGN IN"}
          </Typography>
        </Divider>

        <Box component="form" onSubmit={handleSubmit}>
          <Stack spacing={1.7}>
            {isRegister ? (
              <>
                <TextField
                  label="Username"
                  value={username}
                  onChange={(event) => setUsername(event.target.value.replace(/\s/g, "").toLowerCase())}
                  autoComplete="username"
                  placeholder="e.g. dan_saldariega"
                  helperText="3–24 characters: letters, numbers, and underscores."
                  inputProps={{ minLength: 3, maxLength: 24, pattern: "[a-z0-9_]+" }}
                  required
                  fullWidth
                />
                <TextField
                  label="Full name"
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  autoComplete="name"
                  required
                  fullWidth
                />
                <TextField
                  label="Email address (optional)"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoComplete="email"
                  helperText="Add one if you want email-based recovery later."
                  fullWidth
                />
              </>
            ) : (
              <TextField
                label="Username or email"
                value={identifier}
                onChange={(event) => setIdentifier(event.target.value)}
                autoComplete="username"
                placeholder="Enter your username or email"
                required
                fullWidth
              />
            )}

            <TextField
              label="Password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete={isRegister ? "new-password" : "current-password"}
              inputProps={{ minLength: 8 }}
              helperText={isRegister ? "Use at least 8 characters." : undefined}
              required
              fullWidth
            />

            <Button
              type="submit"
              variant="contained"
              disableElevation
              disabled={loading || !supabase}
              sx={{
                py: 1.3,
                borderRadius: 2.5,
                textTransform: "none",
                fontWeight: 750,
                boxShadow: "0 8px 18px rgba(217, 54, 80, 0.18)",
              }}
            >
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
