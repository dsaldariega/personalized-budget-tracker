"use client";

import { useState, type FormEvent } from "react";
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
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState<(typeof categories)[number]>("General Feedback");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");

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

  function submitFeedback(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

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

    const body = [
      "Hello BudgetNest team,",
      "",
      `Issue Category: ${category}`,
      "",
      "Description:",
      trimmedDescription,
      "",
      "Sent from BudgetNest.",
    ].join("\n");

    const mailto = `mailto:${FEEDBACK_EMAIL}?subject=${encodeURIComponent(trimmedSubject)}&body=${encodeURIComponent(body)}`;

    setStatus(
      "Your email app should now open with the feedback prepared. BudgetNest cannot confirm whether the message was sent."
    );

    try {
      window.location.href = mailto;
    } catch {
      setStatus(
        `We couldn't open your email app automatically. Please open your email app and send your feedback to ${FEEDBACK_EMAIL}.`
      );
    }
  }

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
              Your email app will be used to send the feedback.
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
                This opens your default email application and prepares a message addressed to {FEEDBACK_EMAIL}. Nothing is sent automatically by BudgetNest.
              </Typography>
            </Stack>
          </DialogContent>

          <DialogActions sx={{ px: { xs: 3, sm: 3.5 }, pb: { xs: 2.5, sm: 3 } }}>
            <Button onClick={closeDialog} color="inherit">Cancel</Button>
            <Button type="submit" variant="contained" startIcon={<MailOutlineRounded />}>
              Open email app
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
    </>
  );
}
