"use client";

import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import { apiRequest } from "@/lib/api";
import {
  Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle,
  IconButton, MenuItem, Stack, TextField, Typography,
} from "@mui/material";
import { CloseRounded, FeedbackOutlined, LockOutlined, SendRounded } from "@mui/icons-material";

const categories = [
  { label: "Bug Report", value: "bug" },
  { label: "Feature Request", value: "idea" },
  { label: "UI/UX Improvement", value: "other" },
  { label: "General Feedback", value: "other" },
  { label: "Other", value: "other" },
] as const;

type Props = {
  open: boolean;
  isAuthenticated: boolean;
  onClose: () => void;
  onRequireAuth: () => void;
};

export default function FeedbackForm({ open, isAuthenticated, onClose, onRequireAuth }: Props) {
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState<(typeof categories)[number]["value"]>("other");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function closeDialog() {
    if (submitting) return;
    onClose();
    setError("");
    setStatus("");
    setSubject("");
    setCategory("other");
    setDescription("");
  }

  async function submitFeedback(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    const trimmedSubject = subject.trim();
    const trimmedDescription = description.trim();
    if (!trimmedSubject) {
      setError("Please enter a subject for your feedback.");
      return;
    }
    if (!trimmedDescription || trimmedDescription.length < 10) {
      setError("Please provide at least 10 characters describing your feedback.");
      return;
    }
    if (trimmedDescription.length > 2000) {
      setError("Please keep your feedback within 2,000 characters.");
      return;
    }

    if (!isAuthenticated) {
      setError("");
      onRequireAuth();
      return;
    }

    const supabase = createClient();
    if (!supabase) {
      setError("Authentication is temporarily unavailable. Please try again later.");
      return;
    }

    setError("");
    setStatus("");
    setSubmitting(true);
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        onRequireAuth();
        setError("Please sign in to submit your feedback. Your draft is saved here.");
        return;
      }

      const result = await apiRequest<{ message: string; notificationSent: boolean }>("/feedback", {
        method: "POST",
        body: JSON.stringify({ subject: trimmedSubject, category, message: trimmedDescription }),
      });
      setStatus(result.message);
      setSubject("");
      setCategory("other");
      setDescription("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Your feedback could not be submitted. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog
      scroll="paper"
      open={open}
      onClose={closeDialog}
      fullWidth
      maxWidth="sm"
      aria-labelledby="budgetnest-feedback-title"
      slotProps={{ paper: { sx: { mx: { xs: 1.5, sm: 2 }, borderRadius: { xs: 3, sm: 4 } } } }}
    >
      <DialogTitle id="budgetnest-feedback-title" sx={{ display: "flex", alignItems: "center", gap: 1, pr: 1.5 }}>
        <Box sx={{ width: 38, height: 38, display: "grid", placeItems: "center", borderRadius: 2, bgcolor: "action.hover", color: "primary.main" }}>
          <FeedbackOutlined />
        </Box>
        <Box sx={{ flexGrow: 1 }}>
          <Typography fontWeight={700}>Help us improve BudgetNest</Typography>
          <Typography variant="caption" color="text.secondary">We’d love to hear your thoughts and suggestions.</Typography>
        </Box>
        <IconButton onClick={closeDialog} aria-label="Close feedback dialog" size="small">
          <CloseRounded />
        </IconButton>
      </DialogTitle>

      <Box component="form" onSubmit={submitFeedback} sx={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
        <DialogContent sx={{ pt: 1.5, scrollbarGutter: "stable" }}>
          <Stack spacing={2}>
            {error && <Alert severity="error" onClose={() => setError("")}>{error}</Alert>}
            {status && <Alert severity="success">{status}</Alert>}

            {!isAuthenticated && (
              <Alert severity="info" icon={<LockOutlined />}>
                You can write your feedback now. Sign in is required before it can be submitted, and your draft will stay here while you sign in.
              </Alert>
            )}

            <TextField label="Subject" value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="e.g. Budget page suggestion" required fullWidth autoFocus inputProps={{ maxLength: 120 }} />

            <TextField select label="Feedback category" value={category} onChange={(event) => setCategory(event.target.value as (typeof categories)[number]["value"])} fullWidth>
              {categories.map((item) => <MenuItem key={item.label} value={item.value}>{item.label}</MenuItem>)}
            </TextField>

            <TextField
              label="Your feedback"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Tell us what happened, what you expected, or what you would like to see improved…"
              multiline minRows={5} maxRows={9} required fullWidth
              inputProps={{ maxLength: 2000 }}
              helperText={`${description.length}/2,000 characters`}
            />
          </Stack>
        </DialogContent>

        <DialogActions sx={{ px: { xs: 3, sm: 3.5 }, pb: { xs: 2.5, sm: 3 } }}>
          <Button onClick={closeDialog} color="inherit" disabled={submitting}>Cancel</Button>
          <Button type="submit" variant="contained" startIcon={isAuthenticated ? <SendRounded /> : <LockOutlined />} disabled={submitting}>
            {submitting ? "Submitting…" : isAuthenticated ? "Submit feedback" : "Sign in to submit"}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}
