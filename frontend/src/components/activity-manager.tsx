"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AccountBalanceWalletOutlined, AddCardOutlined, AutorenewRounded, HistoryRounded,
  RefreshRounded, SearchRounded, SwapHorizRounded, TrendingUpRounded,
} from "@mui/icons-material";
import {
  Alert, Avatar, Box, Button, CircularProgress, MenuItem, Paper, Stack, Table,
  TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography,
} from "@mui/material";
import { apiRequest } from "@/lib/api";

type Activity = {
  id: string; action: string; entity_type: string | null; entity_id: string | null;
  details: Record<string, unknown>; created_at: string;
};
const actionLabels: Record<string, string> = {
  "account.created": "Created an account", "account.updated": "Updated an account",
  "account.archived": "Archived an account", "account.restored": "Restored an account",
  "account.deleted": "Deleted an account", "transaction.created": "Added a transaction",
  "transaction.updated": "Updated a transaction", "transaction.deleted": "Deleted a transaction",
  "budget.created": "Created a budget", "budget.updated": "Updated a budget",
  "budget.deleted": "Deleted a budget", "goal.created": "Created a savings goal",
  "goal.updated": "Updated a savings goal", "goal.status_updated": "Changed a savings goal status",
  "goal.deleted": "Deleted a savings goal", "loan.created": "Created a loan",
  "loan.updated": "Updated a loan", "loan.deleted": "Deleted a loan",
  "loan.status_updated": "Changed a loan status", "loan.payment_recorded": "Recorded a loan payment",
  "loan.payment_deleted": "Deleted a loan payment", "subscription.created": "Created a subscription",
  "subscription.updated": "Updated a subscription", "subscription.deleted": "Deleted a subscription",
  "subscription.status_updated": "Changed a subscription status",
  "subscription.payment_recorded": "Recorded a subscription payment",
  "profile.updated": "Updated profile settings",
  "data.transactions_imported": "Imported transactions",
};
function titleCase(value: string) {
  return value.replace(/[._-]/g, " ").replace(/\b\w/g, letter => letter.toUpperCase());
}
function formatDate(value: string) {
  return new Date(value).toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" });
}
function describe(item: Activity) {
  const details = item.details ?? {};
  const name = typeof details.name === "string" ? details.name : "";
  const amount = typeof details.amount === "number" ? details.amount : null;
  const category = typeof details.category === "string" ? details.category : "";
  const type = typeof details.transaction_type === "string" ? details.transaction_type : "";
  const frequency = typeof details.billing_frequency === "string" ? details.billing_frequency : "";
  const parts = [name, type, category, frequency].filter(Boolean);
  if (amount !== null) parts.push(amount.toLocaleString("en-PH", { maximumFractionDigits: 2 }));
  return parts.join(" · ") || (item.entity_type ? titleCase(item.entity_type) : "Account activity");
}
function iconFor(item: Activity) {
  if (item.action.startsWith("transaction")) return <SwapHorizRounded />;
  if (item.action.startsWith("account")) return <AccountBalanceWalletOutlined />;
  if (item.action.startsWith("budget")) return <TrendingUpRounded />;
  if (item.action.startsWith("goal")) return <AddCardOutlined />;
  if (item.action.startsWith("loan")) return <TrendingUpRounded />;
  if (item.action.startsWith("subscription")) return <AutorenewRounded />;
  return <HistoryRounded />;
}

export function ActivityManager() {
  const [items, setItems] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [entityFilter, setEntityFilter] = useState("all");
  const [periodFilter, setPeriodFilter] = useState("30");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const params = new URLSearchParams();
      if (periodFilter !== "all") params.set("days", periodFilter);
      if (entityFilter !== "all") params.set("entity_type", entityFilter);
      const suffix = params.toString() ? `?${params.toString()}` : "";
      const result = await apiRequest<{ activities: Activity[] }>(`/activity${suffix}`);
      setItems(result.activities ?? []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load activity.");
    } finally { setLoading(false); }
  }, [entityFilter, periodFilter]);
  useEffect(() => { void load(); }, [load]);

  const filtered = items.filter(item => {
    const text = [actionLabels[item.action] ?? titleCase(item.action), item.entity_type ?? "", describe(item), item.action].join(" ").toLowerCase();
    return !search || text.includes(search.toLowerCase());
  });
  const todayCount = items.filter(item => new Date(item.created_at).toDateString() === new Date().toDateString()).length;

  return (
    <Stack spacing={3}>
      <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ xs: "stretch", sm: "center" }} spacing={2}>
        <Box><Typography variant="h4" fontWeight={800} letterSpacing={-0.8}>Activity Log</Typography><Typography color="text.secondary" sx={{ mt: 0.7 }}>A clear timeline of the changes you make across BudgetNest.</Typography></Box>
        <Button variant="outlined" startIcon={<RefreshRounded />} onClick={() => void load()} disabled={loading}>Refresh activity</Button>
      </Stack>
      {error && <Alert severity="error">{error}</Alert>}
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2,minmax(0,1fr))" }, gap: 2 }}>
        <Paper variant="outlined" sx={{ p: 2.3, borderRadius: 3 }}><Typography variant="caption" color="text.secondary">Activities in selected period</Typography><Typography variant="h5" fontWeight={800}>{items.length}</Typography></Paper>
        <Paper variant="outlined" sx={{ p: 2.3, borderRadius: 3 }}><Typography variant="caption" color="text.secondary">Recorded today</Typography><Typography variant="h5" fontWeight={800}>{todayCount}</Typography></Paper>
      </Box>
      <Stack direction={{ xs: "column", md: "row" }} spacing={1.5}>
        <TextField size="small" placeholder="Search activity" value={search} onChange={e => setSearch(e.target.value)} fullWidth InputProps={{ startAdornment: <SearchRounded fontSize="small" sx={{ mr: 1, color: "text.secondary" }} /> }} />
        <TextField select size="small" label="Activity type" value={entityFilter} onChange={e => setEntityFilter(e.target.value)} sx={{ minWidth: { md: 180 } }}>
          <MenuItem value="all">All activity</MenuItem>{["account","transaction","budget","goal","loan","subscription"].map(value => <MenuItem key={value} value={value}>{titleCase(value)}</MenuItem>)}
        </TextField>
        <TextField select size="small" label="Date range" value={periodFilter} onChange={e => setPeriodFilter(e.target.value)} sx={{ minWidth: { md: 160 } }}>
          <MenuItem value="7">Last 7 days</MenuItem><MenuItem value="30">Last 30 days</MenuItem><MenuItem value="90">Last 90 days</MenuItem><MenuItem value="365">Last year</MenuItem><MenuItem value="all">All available</MenuItem>
        </TextField>
      </Stack>
      {loading ? <Paper variant="outlined" sx={{ minHeight: 240, display: "grid", placeItems: "center", borderRadius: 3 }}><CircularProgress /></Paper> : filtered.length === 0 ? (
        <Paper variant="outlined" sx={{ p: 5, minHeight: 260, display: "grid", placeItems: "center", textAlign: "center", borderRadius: 3 }}>
          <Stack alignItems="center" spacing={1}><Avatar sx={{ width: 56, height: 56, bgcolor: "action.hover", color: "text.secondary" }}><HistoryRounded /></Avatar><Typography fontWeight={750}>{items.length ? "No matching activity" : "Your activity will appear here"}</Typography><Typography color="text.secondary" variant="body2">{items.length ? "Try changing your search or filters." : "As you create accounts, record transactions, and manage your finances, important changes will show up here."}</Typography></Stack>
        </Paper>
      ) : (
        <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 3 }}>
          <Table>
            <TableHead><TableRow><TableCell>Activity</TableCell><TableCell>Details</TableCell><TableCell>Date and time</TableCell></TableRow></TableHead>
            <TableBody>{filtered.map(item => <TableRow key={item.id} hover>
              <TableCell><Stack direction="row" alignItems="center" spacing={1.2}><Avatar sx={{ width: 34, height: 34, bgcolor: "action.hover", color: "primary.main" }}>{iconFor(item)}</Avatar><Box><Typography fontWeight={700} variant="body2">{actionLabels[item.action] ?? titleCase(item.action)}</Typography><Typography variant="caption" color="text.secondary">{titleCase(item.entity_type ?? "activity")}</Typography></Box></Stack></TableCell>
              <TableCell><Typography variant="body2" color="text.secondary">{describe(item)}</Typography></TableCell>
              <TableCell sx={{ whiteSpace: "nowrap" }}><Typography variant="body2">{formatDate(item.created_at)}</Typography></TableCell>
            </TableRow>)}</TableBody>
          </Table>
        </TableContainer>
      )}
      <Typography variant="caption" color="text.secondary">Showing up to 500 recent records. Activity history is private to your account.</Typography>
    </Stack>
  );
}
