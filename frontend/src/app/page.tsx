"use client";

import {
  AccountBalanceWallet,
  ArrowUpward,
  DarkMode,
  LightMode,
  Menu,
  Savings,
  TrendingDown
} from "@mui/icons-material";
import {
  AppBar,
  Box,
  Card,
  CardContent,
  Chip,
  Container,
  CssBaseline,
  Grid,
  IconButton,
  Paper,
  Stack,
  Toolbar,
  Typography
} from "@mui/material";
import { useThemeMode } from "@/components/theme-provider";

const cards = [
  { title: "Total Balance", value: "₱0.00", icon: <AccountBalanceWallet />, note: "Across all accounts" },
  { title: "This Month", value: "₱0.00", icon: <TrendingDown />, note: "Total spending" },
  { title: "Income", value: "₱0.00", icon: <ArrowUpward />, note: "This month" },
  { title: "Savings Goals", value: "0", icon: <Savings />, note: "Active goals" }
];

export default function Home() {
  const { mode, toggleMode } = useThemeMode();

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
      <AppBar position="sticky" elevation={0} color="transparent">
        <Toolbar sx={{ borderBottom: 1, borderColor: "divider" }}>
          <IconButton edge="start"><Menu /></IconButton>
          <Typography variant="h6" sx={{ ml: 1, fontWeight: 800, flexGrow: 1 }}>
            BudgetNest
          </Typography>
          <Chip label="Dashboard" variant="outlined" sx={{ mr: 1 }} />
          <IconButton onClick={toggleMode} aria-label="toggle theme">
            {mode === "dark" ? <LightMode /> : <DarkMode />}
          </IconButton>
        </Toolbar>
      </AppBar>

      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Stack spacing={1} sx={{ mb: 4 }}>
          <Typography variant="h3" fontWeight={800}>Good evening 👋</Typography>
          <Typography color="text.secondary">
            A clear view of your money, without the spreadsheet headache.
          </Typography>
        </Stack>

        <Grid container spacing={2}>
          {cards.map((card) => (
            <Grid key={card.title} size={{ xs: 12, sm: 6, lg: 3 }}>
              <Card>
                <CardContent>
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                    <Box>
                      <Typography color="text.secondary" variant="body2">{card.title}</Typography>
                      <Typography variant="h5" fontWeight={800} sx={{ mt: 1 }}>{card.value}</Typography>
                    </Box>
                    <Box sx={{ color: "primary.main" }}>{card.icon}</Box>
                  </Stack>
                  <Typography variant="caption" color="text.secondary">{card.note}</Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        <Grid container spacing={2} sx={{ mt: 0 }}>
          <Grid size={{ xs: 12, md: 8 }}>
            <Paper sx={{ p: 3, minHeight: 300 }}>
              <Typography variant="h6" fontWeight={700}>Spending overview</Typography>
              <Typography color="text.secondary" sx={{ mt: 1 }}>
                Transactions will populate this view once your accounts and spending are connected.
              </Typography>
            </Paper>
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <Paper sx={{ p: 3, minHeight: 300 }}>
              <Typography variant="h6" fontWeight={700}>Accounts</Typography>
              <Typography color="text.secondary" sx={{ mt: 1 }}>
                No accounts yet. Add your first bank or financial account to get started.
              </Typography>
            </Paper>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}
