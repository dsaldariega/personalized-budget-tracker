"use client";

import { Dialog, DialogContent, DialogTitle, Fade, IconButton, Typography } from "@mui/material";
import { CloseRounded } from "@mui/icons-material";
import { AuthForm } from "@/components/auth-form";

export function AuthModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      aria-labelledby="budgetnest-login-title"
      slots={{ transition: Fade }}
      slotProps={{
        transition: { timeout: { enter: 220, exit: 180 } },
        paper: {
          sx: {
            width: "100%",
            maxWidth: 480,
            mx: { xs: 1, sm: 1.5 },
            borderRadius: { xs: 1.25, sm: 1.5 },
            overflow: "hidden",
          },
        },
      }}
    >
      <DialogTitle
        id="budgetnest-login-title"
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-end",
          minHeight: 56,
          p: { xs: 0.75, sm: 1 },
          pb: 0,
        }}
      >
        <Typography variant="body2" color="text.secondary" sx={{ mr: "auto", pl: { xs: 0.75, sm: 1 }, fontWeight: 700 }}>
          Sign in to BudgetNest
        </Typography>
        <IconButton
          onClick={onClose}
          aria-label="Close sign in"
          size="small"
          sx={{ color: "text.secondary" }}
        >
          <CloseRounded />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ px: { xs: 2, sm: 3 }, pt: 0.75, pb: { xs: 2.5, sm: 3 } }}>
        <AuthForm mode="login" modal onAuthenticated={onClose} />
      </DialogContent>
    </Dialog>
  );
}
