import type { Metadata } from "next";
import { Suspense } from "react";
import { Box, CircularProgress, Stack, Typography } from "@mui/material";
import { AuthForm } from "@/components/auth-form";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <Box sx={{ minHeight: "calc(100vh - 140px)", display: "grid", placeItems: "center" }}>
      <Stack alignItems="center" spacing={2} sx={{ width: "100%" }}>
        <Box sx={{ width: 48, height: 48, borderRadius: 3, bgcolor: "primary.main", color: "primary.contrastText", display: "grid", placeItems: "center", fontSize: 25, fontWeight: 900 }}>B</Box>
        <Box textAlign="center">
          <Typography variant="h6" fontWeight={800}>BudgetNest</Typography>
          <Typography variant="body2" color="text.secondary">Your money, with a little more clarity.</Typography>
        </Box>
        <Suspense fallback={<CircularProgress />}>
          <AuthForm mode="login" />
        </Suspense>
      </Stack>
    </Box>
  );
}
