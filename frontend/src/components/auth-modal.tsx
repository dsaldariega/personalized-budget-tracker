"use client";

import { Dialog, DialogContent, IconButton, Box } from "@mui/material";
import { CloseRounded } from "@mui/icons-material";
import { AuthForm } from "@/components/auth-form";

export function AuthModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="xs"
      PaperProps={{ sx: { borderRadius: 4, overflow: "hidden" } }}
    >
      <IconButton
        onClick={onClose}
        aria-label="Close sign in"
        sx={{ position: "absolute", right: 12, top: 12, zIndex: 2 }}
      >
        <CloseRounded />
      </IconButton>
      <DialogContent sx={{ p: 0 }}>
        <Box sx={{ p: { xs: 0.5, sm: 1 } }}>
          <AuthForm mode="login" modal onAuthenticated={onClose} />
        </Box>
      </DialogContent>
    </Dialog>
  );
}
