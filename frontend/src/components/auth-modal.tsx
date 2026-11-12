"use client";

import { Dialog, DialogTitle, DialogContent, IconButton, Typography } from "@mui/material";
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
      PaperProps={{
        sx: {
          width: "100%",
          maxWidth: 480,
          mx: { xs: 1.5, sm: 2 },
          borderRadius: { xs: 3, sm: 4 },
          overflow: "hidden",
        },
      }}
    >
      <DialogTitle
        id="budgetnest-login-title"
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          minHeight: 56,
          p: { xs: 1, sm: 1.25 },
          pb: 0,
        }}
      >
        <Typography variant="overline" color="text.secondary" fontWeight={750} letterSpacing={1.1}>
          SECURE SIGN IN
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
      <DialogContent sx={{ px: { xs: 2.5, sm: 4 }, pt: 1, pb: { xs: 3, sm: 4 } }}>
        <AuthForm mode="login" modal onAuthenticated={onClose} />
      </DialogContent>
    </Dialog>
  );
}
