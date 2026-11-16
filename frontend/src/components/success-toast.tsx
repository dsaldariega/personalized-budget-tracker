"use client";

import { Alert, Slide, Snackbar, useMediaQuery } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import {
  CheckCircleRounded, DeleteOutlineRounded, EditRounded, ErrorOutlineRounded,
  InfoOutlined, WarningAmberRounded,
} from "@mui/icons-material";
import type { ReactElement } from "react";

type ToastKind = "success" | "update" | "delete" | "warning" | "error" | "info";
type SuccessToastProps = { message: string; onClose: () => void; type?: ToastKind };

function SlideFromRight(props: React.ComponentProps<typeof Slide>) {
  return <Slide {...props} direction="left" />;
}

function getToastKind(message: string): ToastKind {
  if (/\b(deleted|removed)\b/i.test(message)) return "delete";
  if (/\b(updated|edited|changed)\b/i.test(message)) return "update";
  if (/\b(warning|attention|please check)\b/i.test(message)) return "warning";
  if (/\b(unable|failed|error|could not)\b/i.test(message)) return "error";
  if (/\b(info|reminder|processing)\b/i.test(message)) return "info";
  return "success";
}

const styles: Record<ToastKind, { severity: "success" | "info" | "warning" | "error"; icon: ReactElement; background?: string }> = {
  success: { severity: "success", icon: <CheckCircleRounded /> },
  update: { severity: "info", icon: <EditRounded /> },
  delete: { severity: "error", icon: <DeleteOutlineRounded />, background: "#C62828" },
  warning: { severity: "warning", icon: <WarningAmberRounded /> },
  error: { severity: "error", icon: <ErrorOutlineRounded />, background: "#8E1717" },
  info: { severity: "info", icon: <InfoOutlined /> },
};

export function SuccessToast({ message, onClose, type }: SuccessToastProps) {
  const theme = useTheme();
  const mobile = useMediaQuery(theme.breakpoints.down("sm"));
  const kind = type ?? getToastKind(message);
  const style = styles[kind];
  return (
    <Snackbar
      open={Boolean(message)}
      autoHideDuration={kind === "error" ? 6000 : 4000}
      onClose={(_, reason) => { if (reason !== "clickaway") onClose(); }}
      anchorOrigin={{ vertical: "top", horizontal: mobile ? "center" : "right" }}
      TransitionComponent={SlideFromRight}
      sx={{
        width: mobile ? "calc(100vw - 32px)" : 380,
        maxWidth: "calc(100vw - 32px)",
        zIndex: theme.zIndex.snackbar,
        mt: { xs: 1, sm: 1.5 },
        mr: { sm: 1.5 },
      }}
    >
      <Alert
        severity={style.severity}
        variant="filled"
        icon={style.icon}
        onClose={onClose}
        elevation={6}
        sx={{
          width: "100%", alignItems: "center", px: 1.8, py: 1.15,
          borderRadius: 2, boxShadow: 5,
          ...(style.background ? { bgcolor: style.background, "& .MuiAlert-icon": { color: "#fff" } } : {}),
          "& .MuiAlert-message": { fontSize: "0.9rem", lineHeight: 1.45, fontWeight: 550 },
          "& .MuiAlert-action": { alignItems: "center", pt: 0, mr: -0.5 },
        }}
      >
        {message}
      </Alert>
    </Snackbar>
  );
}
