"use client";

import { useState, type FormEvent } from "react";
import { Alert, Avatar, Box, Button, MenuItem, Paper, Stack, TextField, Typography } from "@mui/material";
import { FeedbackOutlined } from "@mui/icons-material";
import { apiRequest } from "@/lib/api";
import { SuccessToast } from "@/components/success-toast";

type FeedbackCategory = "bug" | "idea" | "other";

export default function FeedbackForm() {
  const [category, setCategory] = useState<FeedbackCategory>("idea");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submitFeedback(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = message.trim();
    if (trimmed.length < 10 || trimmed.length > 2000) {
      setError("Please enter between 10 and 2,000 characters.");
      return;
    }

    setSubmitting(true);
    setError("");
    setNotice("");
    try {
      await apiRequest("/feedback", {
        method: "POST",
        body: JSON.stringify({ category, message: trimmed }),
      });
      setMessage("");
      setCategory("idea");
      setNotice("Thanks for helping make BudgetNest better.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Your feedback could not be sent. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Paper component="section" variant="outlined" sx={{ p: { xs: 2.5, md: 3 }, borderRadius: 3 }}>
      <Stack direction="row" spacing={1.3} alignItems="center" sx={{ mb: 1.2 }}>
        <Avatar sx={{ bgcolor: "action.hover", color: "primary.main" }}><FeedbackOutlined /></Avatar>
        <Box>
          <Typography variant="h5" fontWeight={800} letterSpacing={-0.5}>Help us improve BudgetNest</Typography>
          <Typography variant="body2" color="text.secondary">Found an issue or have an idea? Send feedback directly from the app.</Typography>
        </Box>
      </Stack>
      <Box component="form" onSubmit={submitFeedback} sx={{ mt: 2 }}>
        <Stack spacing={2}>
          {error && <Alert severity="error" onClose={() => setError("")}>{error}</Alert>}
          <TextField select label="Feedback type" value={category} onChange={event => setCategory(event.target.value as FeedbackCategory)} fullWidth>
            <MenuItem value="idea">Suggestion or idea</MenuItem>
            <MenuItem value="bug">Report a problem</MenuItem>
            <MenuItem value="other">Other feedback</MenuItem>
          </TextField>
          <TextField
            label="Your feedback"
            placeholder="Tell us what happened or what would make BudgetNest better…"
            value={message}
            onChange={event => setMessage(event.target.value)}
            multiline minRows={4} maxRows={8} fullWidth
            inputProps={{ maxLength: 2000 }}
            helperText={message.length + "/2,000 characters · Minimum 10 characters"}
          />
          <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
            <Button type="submit" variant="contained" disabled={submitting || message.trim().length < 10}>
              {submitting ? "Sending…" : "Send feedback"}
            </Button>
          </Box>
          <Typography variant="caption" color="text.secondary">
            Your feedback is stored with your signed-in account so it can be reviewed. Please do not include passwords, card numbers, PINs, or other sensitive banking details.
          </Typography>
        </Stack>
      </Box>
      <SuccessToast message={notice} onClose={() => setNotice("")} />
    </Paper>
  );
}
