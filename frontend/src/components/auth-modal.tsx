"use client";

import {
  Dialog,
  DialogContent,
  DialogTitle,
  Fade,
  IconButton,
} from "@mui/material";
import { CloseRounded } from "@mui/icons-material";
import { useEffect, useState } from "react";
import { AuthForm } from "@/components/auth-form";

export function AuthModal({
  open,
  onClose,
  initialMode = "login",
}: {
  open: boolean;
  onClose: () => void;
  initialMode?: "login" | "register";
}) {
  const [mode, setMode] = useState<"login" | "register">(initialMode);

  useEffect(() => {
    if (open) setMode(initialMode);
  }, [open, initialMode]);
  return (
    <Dialog
      scroll="paper"
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      aria-labelledby="budgetnest-auth-title"
      slots={{ transition: Fade }}
      slotProps={{
        transition: { timeout: { enter: 220, exit: 180 } },
        paper: {
          sx: {
            width: "100%",
            maxWidth: 560,
            mx: { xs: 1, sm: 1.5 },
            borderRadius: { xs: 1.25, sm: 1.5 },
            overflow: "hidden",
          },
        },
      }}
    >
      <DialogTitle
        id="budgetnest-auth-title"
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-end",
          minHeight: 54,
          p: { xs: 0.75, sm: 1.25 },
          pb: 0,
        }}
      >
        <IconButton
          onClick={onClose}
          aria-label="Close sign in"
          size="small"
          sx={{ color: "text.secondary" }}
        >
          <CloseRounded />
        </IconButton>
      </DialogTitle>
      <DialogContent
        sx={{ px: { xs: 2, sm: 4 }, pt: 0.75, pb: { xs: 2.5, sm: 4 } }}
      >
        <AuthForm
          mode={mode}
          modal
          onAuthenticated={onClose}
          onSwitchAuthMode={() =>
            setMode((current) => (current === "login" ? "register" : "login"))
          }
        />
      </DialogContent>
    </Dialog>
  );
}
