"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import { apiRequest } from "@/lib/api";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { CloseRounded, FeedbackOutlined, MailOutlineRounded } from "@mui/icons-material";

const FEEDBACK_EMAIL = "dsaldariega@gmail.com";

const categories = [
  "Bug Report",
  "Feature Request",
  "UI/UX Improvement",
  "General Feedback",
  "Other",
] as const;

export default function FeedbackForm() {
  const supabase = useMemo(() => createClient(), []);
  const [authReady, setAuthReady] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState<(typeof categories)[number]>("General Feedback");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");

  useEffect(() => {
    if (!supabase) { setAuthReady(true); return; }
    let active = true;
    supabase.auth.getUser().then(({ data }) => {
      if (!active) return;
      setIsAuthenticated(Boolean(data.user));
      setAuthReady(true);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      setIsAuthenticated(Boolean(session?.user));
      if (!session?.user) setOpen(false);
    });
    return () => { active = false; subscription.unsubscribe(); };
  }, [supabase]);

  function resetForm() {
    setSubject("");
    setCategory("General Feedback");
    setDescription("");
    setError("");
    setStatus("");
  }

  function closeDialog() {
    setOpen(false);
    resetForm();
  }

  async function submitFeedback(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isAuthenticated || submitting) return;

    const trimmedSubject = subject.trim();
    const trimmedDescription = description.trim();

    if (!trimmedSubject) {
      setError("Please enter a subject for your feedback.");
      return;
    }

    if (!trimmedDescription) {
      setError("Please describe your feedback before continuing.");
      return;
    }

    if (trimmedDescription.length < 10) {
      setError("Please provide at least 10 characters so the feedback is useful.");
      return;
    }

    if (trimmedDescription.length > 2000) {
      setError("Please keep the description within 2,000 characters.");
      return;
    }

    setError("");
    setStatus("");
    setSubmitting(true);
    try {
      const result = await apiRequest<{ message: string; notificationSent: boolean }>("/feedback", {
        method: "POST",
        body: JSON.stringify({
          subject: trimmedSubject,
          category: category === "Bug Report" ? "bug" : category === "Feature Request" ? "idea" : "other",
          message: trimmedDescription,
        }),
      });
      setStatus(result.message);
      setSubject("");
      setCategory("General Feedback");
      setDescription("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Your feedback could not be submitted. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!authReady || !isAuthenticated) return null;

  return (
    <>
      <Paper component="section" variant="outlined" sx={{ p: { xs: 2.5, md: 3 }, borderRadius: 1.5 }}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems={{ xs: "flex-start", sm: "center" }} justifyContent="space-between">
          <Stack direction="row" spacing={1.3} alignItems="center">
            <Avatar sx={{ bgcolor: "action.hover", color: "primary.main" }}>
              <FeedbackOutlined />
            </Avatar>
            <Box>
              <Typography variant="h5" fontWeight={700} letterSpacing={-0.5}>Help us improve BudgetNest</Typography>
              <Typography variant="body2" color="text.secondary">
                Found an issue or have an idea? Tell us what would make BudgetNest better.
              </Typography>
            </Box>
          </Stack>
          <Button
            variant="contained"
            startIcon={<MailOutlineRounded />}
            onClick={() => {
              setError("");
              setStatus("");
              setOpen(true);
            }}
            sx={{ flexShrink: 0, minWidth: { sm: 150 } }}
          >
            Send feedback
          </Button>
        </Stack>
      </Paper>

      <Dialog scroll="paper"
        open={open}
        onClose={closeDialog}
        fullWidth
        maxWidth="sm"
        aria-labelledby="budgetnest-feedback-title"
        slotProps={{
          paper: {
            sx: {
              mx: { xs: 1.5, sm: 2 },
              borderRadius: { xs: 3, sm: 4 },
            },
          },
        }}
      >
        <DialogTitle
          id="budgetnest-feedback-title"
          sx={{ display: "flex", alignItems: "center", gap: 1, pr: 1.5 }}
        >
          <Avatar sx={{ width: 36, height: 36, bgcolor: "action.hover", color: "primary.main" }}>
            <FeedbackOutlined sx={{ fontSize: 20 }} />
          </Avatar>
          <Box sx={{ flexGrow: 1 }}>
            <Typography fontWeight={700}>Help us improve BudgetNest</Typography>
            <Typography variant="caption" color="text.secondary">
              Feedback will be sent to {FEEDBACK_EMAIL}.
            </Typography>
          </Box>
          <IconButton onClick={closeDialog} aria-label="Close feedback dialog" size="small">
            <CloseRounded />
          </IconButton>
        </DialogTitle>

        <Box component="form" onSubmit={submitFeedback} sx={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
          <DialogContent sx={{ pt: 1.5, scrollbarGutter: "stable" }}>
            <Stack spacing={2}>
              {error && (
                <Alert severity="error" onClose={() => setError("")}>
                  {error}
                </Alert>
              )}

              {status && (
                <Alert severity="success">
                  {status}
                </Alert>
              )}

              <TextField
                label="Subject"
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
                placeholder="e.g. Budget page suggestion"
                required
                fullWidth
                autoFocus
                inputProps={{ maxLength: 120 }}
              />

              <TextField
                select
                label="Issue category"
                value={category}
                onChange={(event) => setCategory(event.target.value as (typeof categories)[number])}
                fullWidth
              >
                {categories.map((item) => (
                  <MenuItem key={item} value={item}>{item}</MenuItem>
                ))}
              </TextField>

              <TextField
                label="Description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Tell us what happened, what you expected, or what you would like to see improved…"
                multiline
                minRows={5}
                maxRows={9}
                required
                fullWidth
                inputProps={{ maxLength: 2000 }}
                helperText={`${description.length}/2,000 characters`}
              />

              <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                Feedback recipient: {FEEDBACK_EMAIL}
              </Typography>
            </Stack>
          </DialogContent>

          <DialogActions sx={{ px: { xs: 3, sm: 3.5 }, pb: { xs: 2.5, sm: 3 } }}>
            <Button onClick={closeDialog} color="inherit">Cancel</Button>
            <Button type="submit" variant="contained" startIcon={<MailOutlineRounded />} disabled={submitting}>
              {submitting ? "Submitting…" : "Submit feedback"}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
    </>
  );
}
