"use client";

import {
  AccountBalanceWalletOutlined, ArrowDownwardRounded, ArrowUpwardRounded,
  SavingsOutlined, TrendingUpRounded
} from "@mui/icons-material";
import {
  Box, Button, Card, CardContent, Chip, Grid, Paper,
  Stack, Typography
} from "@mui/material";

const metrics = [
  { label: "Total balance", amount: "₱0.00", detail: "Across all accounts", icon: <AccountBalanceWalletOutlined />, tone: "#8B7BFF" },
  { label: "Income this month", amount: "₱0.00", detail: "No income recorded yet", icon: <ArrowDownwardRounded />, tone: "#35B78A" },
  { label: "Spent this month", amount: "₱0.00", detail: "No expenses recorded yet", icon: <ArrowUpwardRounded />, tone: "#E6A34A" },
  { label: "Savings goals", amount: "0 active", detail: "Start with a goal in mind", icon: <SavingsOutlined />, tone: "#48A9D6" }
];

function SectionHeading({ title, action }: { title: string; action?: string }) {
  return <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.8 }}>
    <Typography fontWeight={750} fontSize={16}>{title}</Typography>
    {action && <Button size="small" sx={{ textTransform: "none" }}>{action}</Button>}
  </Stack>;
}

export default function DashboardPage() {
  return (
    <Stack spacing={3}>
      <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ sm: "center" }} spacing={2}>
        <Box>
          <Typography variant="h4" fontWeight={800} letterSpacing={-1}>Your money at a glance.</Typography>
          <Typography color="text.secondary" sx={{ mt: 0.7 }}>A simple overview to help you stay in control.</Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Chip label="November 2026" variant="outlined" />
          <Button variant="contained" disableElevation sx={{ textTransform: "none", borderRadius: 2.5 }} href="/transactions">Add transaction</Button>
        </Stack>
      </Stack>

      <Grid container spacing={2}>
        {metrics.map((metric) => (
          <Grid key={metric.label} size={{ xs: 12, sm: 6, xl: 3 }}>
            <Card sx={{ height: "100%" }}>
              <CardContent sx={{ p: 2.5, "&:last-child": { pb: 2.5 } }}>
                <Stack direction="row" alignItems="center" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary" fontWeight={600}>{metric.label}</Typography>
                  <Box sx={{ width: 38, height: 38, display: "grid", placeItems: "center", borderRadius: 2.5, color: metric.tone, bgcolor: `${metric.tone}18` }}>{metric.icon}</Box>
                </Stack>
                <Typography variant="h4" fontWeight={800} letterSpacing={-0.8} sx={{ mt: 2 }}>{metric.amount}</Typography>
                <Typography variant="caption" color="text.secondary">{metric.detail}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={2.5}>
        <Grid size={{ xs: 12, lg: 8 }}>
          <Paper sx={{ p: { xs: 2.5, md: 3 }, minHeight: 330 }}>
            <SectionHeading title="Cash flow" action="View transactions" />
            <Stack direction="row" spacing={3} sx={{ mb: 2 }}>
              <Box><Typography variant="caption" color="text.secondary">Income</Typography><Typography fontWeight={750}>₱0.00</Typography></Box>
              <Box><Typography variant="caption" color="text.secondary">Expenses</Typography><Typography fontWeight={750}>₱0.00</Typography></Box>
            </Stack>
            <Box sx={{ height: 190, display: "grid", placeItems: "center", borderRadius: 3, bgcolor: "action.hover", textAlign: "center", px: 2 }}>
              <Box>
                <TrendingUpRounded sx={{ fontSize: 32, color: "text.disabled", mb: 1 }} />
                <Typography fontWeight={650}>Your cash flow will appear here</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>Add a transaction to start building your monthly picture.</Typography>
              </Box>
            </Box>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, lg: 4 }}>
          <Paper sx={{ p: { xs: 2.5, md: 3 }, minHeight: 330 }}>
            <SectionHeading title="Budget progress" action="All budgets" />
            <Stack alignItems="center" justifyContent="center" sx={{ minHeight: 240, textAlign: "center" }}>
              <Box sx={{ width: 62, height: 62, borderRadius: "50%", bgcolor: "action.hover", display: "grid", placeItems: "center", mb: 1.5 }}>
                <SavingsOutlined sx={{ color: "text.secondary", fontSize: 29 }} />
              </Box>
              <Typography fontWeight={650}>No budgets yet</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 230, mt: 0.5 }}>Create a budget to give your spending a little direction.</Typography>
              <Button href="/budgets" sx={{ mt: 1.5, textTransform: "none" }}>Create a budget</Button>
            </Stack>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper sx={{ p: 3, minHeight: 230 }}>
            <SectionHeading title="Your accounts" action="Manage accounts" />
            <Stack direction="row" spacing={1.5} alignItems="center" sx={{ py: 2 }}>
              <Box sx={{ width: 42, height: 42, display: "grid", placeItems: "center", borderRadius: 2.5, bgcolor: "action.hover" }}><AccountBalanceWalletOutlined color="action" /></Box>
              <Box sx={{ flexGrow: 1 }}>
                <Typography fontWeight={650}>No accounts connected</Typography>
                <Typography variant="caption" color="text.secondary">Add a bank, e-wallet, or cash account.</Typography>
              </Box>
              <Button href="/accounts" size="small" sx={{ textTransform: "none" }}>Add</Button>
            </Stack>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper sx={{ p: 3, minHeight: 230 }}>
            <SectionHeading title="Recent activity" action="Activity log" />
            <Stack alignItems="center" justifyContent="center" sx={{ minHeight: 130, textAlign: "center" }}>
              <Typography color="text.secondary" variant="body2">Nothing to show just yet. Your recent activity will live here.</Typography>
            </Stack>
          </Paper>
        </Grid>
      </Grid>
    </Stack>
  );
}
