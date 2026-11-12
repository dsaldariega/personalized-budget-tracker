"use client";

import { Alert, Snackbar } from "@mui/material";

type SuccessToastProps = {
  message: string;
  onClose: () => void;
};

export function SuccessToast({ message, onClose }: SuccessToastProps) {
  return (
    <Snackbar
      open={Boolean(message)}
      autoHideDuration={4000}
      onClose={(_, reason) => {
        if (reason !== "clickaway") onClose();
      }}
      anchorOrigin={{ vertical: "top", horizontal: "right" }}
    >
      <Alert severity="success" variant="filled" onClose={onClose} elevation={6}>
        {message}
      </Alert>
    </Snackbar>
  );
}
