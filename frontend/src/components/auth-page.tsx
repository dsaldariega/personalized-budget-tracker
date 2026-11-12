import type { ReactNode } from "react";
import Link from "next/link";
import {
  AccountBalanceWalletRounded,
  AutoAwesomeRounded,
  InsightsRounded,
  ShieldRounded,
} from "@mui/icons-material";
import { Box, Chip, Stack, Typography } from "@mui/material";

export function AuthPage({
  children,
  mode,
}: {
  children: ReactNode;
  mode: "login" | "register";
}) {
  const isLogin = mode === "login";

  return (
    <Box
      sx={{
        minHeight: "100svh",
        display: "grid",
        gridTemplateColumns: { xs: "1fr", md: "minmax(0, 1.05fr) minmax(420px, 0.95fr)" },
        bgcolor: "background.default",
      }}
    >
      <Box
        sx={{
          position: "relative",
          display: { xs: "none", md: "flex" },
          flexDirection: "column",
          justifyContent: "space-between",
          minHeight: "100svh",
          overflow: "hidden",
          p: { md: 5, lg: 7 },
          color: "#fff",
          background: "linear-gradient(145deg, #263238 0%, #37474F 48%, #B71C1C 100%)",
          "&::before": {
            content: '""',
            position: "absolute",
            width: 520,
            height: 520,
            borderRadius: "50%",
            right: -190,
            top: -180,
            border: "1px solid rgba(255,255,255,0.13)",
            boxShadow: "0 0 0 48px rgba(255,255,255,0.035), 0 0 0 100px rgba(255,255,255,0.025)",
          },
          "&::after": {
            content: '""',
            position: "absolute",
            width: 320,
            height: 320,
            borderRadius: "50%",
            left: -190,
            bottom: -160,
            bgcolor: "rgba(239,83,80,0.14)",
            filter: "blur(2px)",
          },
        }}
      >
        <Stack direction="row" alignItems="center" spacing={1.5} sx={{ position: "relative", zIndex: 1 }}>
          <Box sx={{ width: 44, height: 44, display: "grid", placeItems: "center", borderRadius: 3, bgcolor: "#D32F2F", boxShadow: "0 8px 24px rgba(0,0,0,0.18)" }}>
            <AccountBalanceWalletRounded sx={{ color: "#fff", fontSize: 25 }} />
          </Box>
          <Box>
            <Typography fontSize={19} fontWeight={850} letterSpacing={-0.6}>BudgetNest</Typography>
            <Typography sx={{ color: "rgba(255,255,255,0.58)", fontSize: 10, letterSpacing: 1.8, fontWeight: 750 }}>PERSONAL FINANCE, MADE CLEAR</Typography>
          </Box>
        </Stack>

        <Box sx={{ position: "relative", zIndex: 1, maxWidth: 560, py: 5 }}>
          <Chip
            icon={<AutoAwesomeRounded sx={{ color: "#FFD6A0 !important", fontSize: "16px !important" }} />}
            label="A calmer way to manage money"
            sx={{ mb: 3, color: "#FFE5C8", bgcolor: "rgba(255,255,255,0.09)", border: "1px solid rgba(255,255,255,0.12)", fontWeight: 650 }}
          />
          <Typography component="h1" sx={{ fontSize: { md: 42, lg: 54 }, lineHeight: 1.08, letterSpacing: -2.2, fontWeight: 800, maxWidth: 540 }}>
            Make room for the things that matter.
          </Typography>
          <Typography sx={{ mt: 2.5, maxWidth: 440, color: "rgba(255,255,255,0.7)", fontSize: 16, lineHeight: 1.8 }}>
            See your spending clearly, stay ahead of your commitments, and build better money habits one step at a time.
          </Typography>

          <Box
            sx={{
              mt: 5,
              p: 2.5,
              maxWidth: 440,
              borderRadius: 4,
              bgcolor: "rgba(255,255,255,0.10)",
              border: "1px solid rgba(255,255,255,0.13)",
              boxShadow: 3,
              backdropFilter: "blur(12px)",
            }}
          >
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography sx={{ color: "rgba(255,255,255,0.66)", fontSize: 12, fontWeight: 650 }}>YOUR FINANCIAL OVERVIEW</Typography>
              <InsightsRounded sx={{ color: "#F8A4AD", fontSize: 20 }} />
            </Stack>
            <Typography sx={{ mt: 2.2, color: "rgba(255,255,255,0.65)", fontSize: 12 }}>Small steps. Steady progress.</Typography>
            <Stack direction="row" spacing={1} sx={{ mt: 1.4 }}>
              {[42, 66, 51, 82, 61, 92, 73, 100, 78, 88, 69, 96].map((height, index) => (
                <Box key={index} sx={{ flex: 1, height: 64, display: "flex", alignItems: "flex-end" }}>
                  <Box sx={{ width: "100%", height: `${height}%`, borderRadius: 1, bgcolor: index === 7 ? "#F6A0A9" : "rgba(255,255,255,0.28)" }} />
                </Box>
              ))}
            </Stack>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 2 }}>
              <ShieldRounded sx={{ color: "#9FE0C8", fontSize: 17 }} />
              <Typography sx={{ color: "rgba(255,255,255,0.72)", fontSize: 11 }}>Your finances, organized in one place.</Typography>
            </Stack>
          </Box>
        </Box>

        <Typography sx={{ position: "relative", zIndex: 1, color: "rgba(255,255,255,0.45)", fontSize: 11 }}>
          Spend with intention. Save with confidence.
        </Typography>
      </Box>

      <Box
        sx={{
          minHeight: "100svh",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          px: { xs: 2, sm: 4, md: 5, lg: 7 },
          py: { xs: 4, md: 5 },
          position: "relative",
          overflow: "hidden",
          bgcolor: "background.default",
          "&::before": {
            content: '""',
            position: "absolute",
            width: 360,
            height: 360,
            borderRadius: "50%",
            right: -190,
            top: -180,
            bgcolor: "action.hover",
          },
          "&::after": {
            content: '""',
            position: "absolute",
            width: 280,
            height: 280,
            borderRadius: "50%",
            left: -170,
            bottom: -170,
            bgcolor: "action.hover",
          },
        }}
      >
        <Stack direction="row" alignItems="center" spacing={1.2} sx={{ display: { xs: "flex", md: "none" }, mb: 4 }}>
          <Box sx={{ width: 38, height: 38, display: "grid", placeItems: "center", borderRadius: 2.5, bgcolor: "primary.main", color: "#fff" }}>
            <AccountBalanceWalletRounded />
          </Box>
          <Typography fontWeight={850} fontSize={18} letterSpacing={-0.5}>BudgetNest</Typography>
        </Stack>
        <Box sx={{ width: "100%", maxWidth: 430, position: "relative", zIndex: 1 }}>
          <Box sx={{ display: "flex", justifyContent: "flex-end", mb: { xs: 2.5, sm: 3 } }}>
            <Link
            href="/"
            style={{
              color: "inherit",
              textDecoration: "none",
              fontSize: 13,
              fontWeight: 700,
            }}
          >
            <span style={{ color: "inherit" }}>← Back to BudgetNest</span>
          </Link>
          </Box>
          <Typography sx={{ mb: 1, color: "primary.main", fontSize: 11, fontWeight: 800, letterSpacing: 1.6, textTransform: "uppercase" }}>
            {isLogin ? "Your finances, in focus" : "A better money routine starts here"}
          </Typography>
          {children}
          <Stack direction="row" alignItems="center" justifyContent="center" spacing={0.7} sx={{ mt: 2, color: "text.disabled" }}>
            <ShieldRounded sx={{ fontSize: 15 }} />
            <Typography variant="caption">Your account is protected with secure authentication</Typography>
          </Stack>
          <Typography variant="caption" color="text.disabled" textAlign="center" display="block" sx={{ mt: 2 }}>
            © {new Date().getFullYear()} BudgetNest
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}
