"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AccountBalanceWalletOutlined, ArrowDownwardRounded, ArrowUpwardRounded,
  EventRepeatRounded, RefreshRounded, SavingsOutlined, ShowChartRounded, WalletOutlined,
} from "@mui/icons-material";
import {
  Alert, Avatar, Box, Button, Card, CardContent, Chip, CircularProgress,
  FormControl, Grid, LinearProgress, MenuItem, Paper, Select, Stack,
  Typography,
} from "@mui/material";
import { createClient } from "@/lib/supabase/client";

type Account = { id: string; name: string; currency: string; opening_balance: number; is_archived: boolean; account_type: string };
type Transaction = { id: string; account_id: string; transaction_type: "income" | "expense" | "transfer"; amount: number; category: string | null; description: string | null; transaction_date: string; transfer_direction: "in" | "out" | null };
type Budget = { id: string; account_id: string; name: string; category: string; amount: number; period: "weekly" | "monthly" | "yearly" | "custom"; start_date: string; end_date: string | null };
type Goal = { id: string; account_id: string; name: string; target_amount: number; current_amount: number; target_date: string | null; status: "active" | "paused" | "completed" };
type Subscription = { id: string; account_id: string; name: string; amount: number; billing_frequency: "weekly" | "monthly" | "quarterly" | "yearly"; next_billing_date: string; is_active: boolean };
type Period = "month" | "lastMonth" | "90days" | "year";

const periodOptions: { value: Period; label: string }[] = [
  { value: "month", label: "This month" },
  { value: "lastMonth", label: "Last month" },
  { value: "90days", label: "Last 90 days" },
  { value: "year", label: "This year" },
];

function dateOnly(date: Date) {
  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
}
function isoDate(date: Date) { return date.toISOString().slice(0, 10); }
function getRange(period: Period, now: Date) {
  const today = dateOnly(now);
  let start: Date;
  let end = today;
  if (period === "lastMonth") {
    start = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 1, 1));
    end = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 0));
  } else if (period === "90days") {
    start = new Date(today); start.setUTCDate(start.getUTCDate() - 89);
  } else if (period === "year") {
    start = new Date(Date.UTC(today.getUTCFullYear(), 0, 1));
  } else {
    start = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
  }
  return { start: isoDate(start), end: isoDate(end) };
}
function money(value: number, currency: string) {
  try { return new Intl.NumberFormat("en-PH", { style: "currency", currency, maximumFractionDigits: 2 }).format(value); }
  catch { return currency + " " + value.toLocaleString("en-PH", { maximumFractionDigits: 2 }); }
}
function shortDate(value: string) {
  const date = new Date(value + "T12:00:00");
  return date.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });
}
function shiftMonths(date: Date, amount: number) {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + amount;
  const targetFirst = new Date(Date.UTC(year, month, 1));
  const lastDay = new Date(Date.UTC(targetFirst.getUTCFullYear(), targetFirst.getUTCMonth() + 1, 0)).getUTCDate();
  return new Date(Date.UTC(targetFirst.getUTCFullYear(), targetFirst.getUTCMonth(), Math.min(date.getUTCDate(), lastDay)));
}
function budgetWindow(budget: Budget, today: Date) {
  const start = new Date(budget.start_date + "T00:00:00Z");
  const current = dateOnly(today);
  const expiry = budget.end_date ? new Date(budget.end_date + "T00:00:00Z") : null;
  if (current < start || (expiry && current > expiry)) return null;
  if (budget.period === "custom") return { start: budget.start_date, end: budget.end_date ?? isoDate(current) };
  let cycleStart: Date;
  let cycleEnd: Date;
  if (budget.period === "weekly") {
    const days = Math.floor((current.getTime() - start.getTime()) / 86400000);
    cycleStart = new Date(start); cycleStart.setUTCDate(cycleStart.getUTCDate() + Math.floor(days / 7) * 7);
    cycleEnd = new Date(cycleStart); cycleEnd.setUTCDate(cycleEnd.getUTCDate() + 6);
  } else {
    const monthsPerCycle = budget.period === "yearly" ? 12 : 1;
    const monthDiff = (current.getUTCFullYear() - start.getUTCFullYear()) * 12 + current.getUTCMonth() - start.getUTCMonth();
    const cycle = Math.floor(monthDiff / monthsPerCycle);
    cycleStart = shiftMonths(start, cycle * monthsPerCycle);
    cycleEnd = shiftMonths(start, (cycle + 1) * monthsPerCycle);
    cycleEnd.setUTCDate(cycleEnd.getUTCDate() - 1);
  }
  if (expiry && cycleEnd > expiry) cycleEnd = expiry;
  return { start: isoDate(cycleStart), end: isoDate(cycleEnd) };
}
function SectionTitle({ title, href, action = "View all" }: { title: string; href: string; action?: string }) {
  return <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
    <Typography fontWeight={800} fontSize={16}>{title}</Typography>
    <Button component={Link} href={href} size="small" sx={{ textTransform: "none" }}>{action}</Button>
  </Stack>;
}
function EmptyState({ title, detail, href, action }: { title: string; detail: string; href: string; action: string }) {
  return <Stack alignItems="center" justifyContent="center" spacing={0.7} sx={{ py: 3, textAlign: "center" }}>
    <Typography fontWeight={700}>{title}</Typography>
    <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 280 }}>{detail}</Typography>
    <Button component={Link} href={href} size="small" sx={{ mt: 0.5, textTransform: "none" }}>{action}</Button>
  </Stack>;
}
function CashFlowChart({ rows, currency }: { rows: { label: string; income: number; expense: number }[]; currency: string }) {
  const max = Math.max(1, ...rows.flatMap(row => [row.income, row.expense]));
  const chartHeight = 150;
  const width = 620;
  const groupWidth = width / rows.length;
  return <Box sx={{ width: "100%", overflow: "hidden" }}>
    <svg viewBox={`0 0 ${width} 190`} role="img" aria-label="Income and expenses by month" style={{ display: "block", width: "100%", height: "auto" }}>
      {[0, 1, 2, 3].map(line => {
        const y = 12 + line * (chartHeight / 3);
        return <line key={line} x1="0" x2={width} y1={y} y2={y} stroke="currentColor" opacity="0.10" strokeDasharray="4 5" />;
      })}
      {rows.map((row, index) => {
        const x = index * groupWidth + groupWidth / 2;
        const incomeHeight = row.income / max * chartHeight;
        const expenseHeight = row.expense / max * chartHeight;
        return <g key={row.label}>
          <rect x={x - 17} y={12 + chartHeight - incomeHeight} width="13" height={incomeHeight} rx="5" fill="#25A77A" opacity="0.9" />
          <rect x={x + 4} y={12 + chartHeight - expenseHeight} width="13" height={expenseHeight} rx="5" fill="#F08B65" opacity="0.9" />
          <text x={x} y="181" fontSize="11" textAnchor="middle" fill="currentColor" opacity="0.65">{row.label}</text>
        </g>;
      })}
    </svg>
    <Stack direction="row" justifyContent="center" spacing={2.5} sx={{ mt: 0.5 }}>
      <Stack direction="row" alignItems="center" spacing={0.7}><Box sx={{ width: 9, height: 9, borderRadius: 1, bgcolor: "#25A77A" }} /><Typography variant="caption" color="text.secondary">Income</Typography></Stack>
      <Stack direction="row" alignItems="center" spacing={0.7}><Box sx={{ width: 9, height: 9, borderRadius: 1, bgcolor: "#F08B65" }} /><Typography variant="caption" color="text.secondary">Expenses</Typography></Stack>
    </Stack>
    <Typography variant="caption" color="text.secondary" sx={{ display: "block", textAlign: "center", mt: 0.5 }}>Amounts shown in {currency}</Typography>
  </Box>;
}

export function DashboardManager() {
  const supabase = useMemo(() => createClient(), []);
  const [now, setNow] = useState<Date | null>(null);
  const [period, setPeriod] = useState<Period>("month");
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currencyFilter, setCurrencyFilter] = useState("all");

  const loadData = useCallback(async () => {
    if (!supabase) { setError("Supabase is not configured. Check your frontend environment variables."); setLoading(false); return; }
    setLoading(true); setError("");
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) { setError("Your session could not be verified. Please sign in again."); setLoading(false); return; }
    const fetchAllTransactions = async () => {
      const rows: Transaction[] = [];
      const pageSize = 1000;
      for (let offset = 0; ; offset += pageSize) {
        const result = await supabase
          .from("transactions")
          .select("id,account_id,transaction_type,amount,category,description,transaction_date,transfer_direction")
          .eq("user_id", user.id)
          .order("transaction_date", { ascending: false })
          .range(offset, offset + pageSize - 1);
        if (result.error) return { data: null, error: result.error };
        const page = (result.data ?? []) as Transaction[];
        rows.push(...page);
        if (page.length < pageSize) break;
      }
      return { data: rows, error: null };
    };
    const [accountResult, transactionResult, budgetResult, goalResult, subscriptionResult] = await Promise.all([
      supabase.from("accounts").select("id,name,currency,opening_balance,is_archived,account_type").eq("user_id", user.id).order("created_at", { ascending: false }),
      fetchAllTransactions(),
      supabase.from("budgets").select("id,account_id,name,category,amount,period,start_date,end_date").eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("savings_goals").select("id,account_id,name,target_amount,current_amount,target_date,status").eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("subscriptions").select("id,account_id,name,amount,billing_frequency,next_billing_date,is_active").eq("user_id", user.id).eq("is_active", true).order("next_billing_date", { ascending: true }),
    ]);
    const failed = [accountResult, transactionResult, budgetResult, goalResult, subscriptionResult].find(result => result.error);
    if (failed?.error) setError(failed.error.message);
    setAccounts((accountResult.data ?? []) as Account[]);
    setTransactions((transactionResult.data ?? []) as Transaction[]);
    setBudgets((budgetResult.data ?? []) as Budget[]);
    setGoals((goalResult.data ?? []) as Goal[]);
    setSubscriptions((subscriptionResult.data ?? []) as Subscription[]);
    setNow(new Date());
    setLoading(false);
  }, [supabase]);

  useEffect(() => { void loadData(); }, [loadData]);
  const accountMap = useMemo(() => new Map(accounts.map(account => [account.id, account])), [accounts]);
  const currencies = useMemo(() => Array.from(new Set(accounts.filter(a => !a.is_archived).map(a => a.currency))).sort(), [accounts]);
  const selectedCurrency = currencyFilter === "all" || !currencies.includes(currencyFilter)
    ? (currencies.length === 1 ? currencies[0] : "all")
    : currencyFilter;
  const activeAccounts = accounts.filter(account => !account.is_archived && (selectedCurrency === "all" || account.currency === selectedCurrency));
  const balances = activeAccounts.map(account => ({
    ...account,
    balance: Number(account.opening_balance) + transactions.filter(t => t.account_id === account.id).reduce((sum, t) => {
      if (t.transaction_type === "income" || (t.transaction_type === "transfer" && t.transfer_direction === "in")) return sum + Number(t.amount);
      return sum - Number(t.amount);
    }, 0),
  }));
  const range = now ? getRange(period, now) : null;
  const periodTransactions = range ? transactions.filter(t => t.transaction_date >= range.start && t.transaction_date <= range.end && t.transaction_type !== "transfer" && (selectedCurrency === "all" || accountMap.get(t.account_id)?.currency === selectedCurrency)) : [];
  const income = periodTransactions.filter(t => t.transaction_type === "income").reduce((sum, t) => sum + Number(t.amount), 0);
  const expenses = periodTransactions.filter(t => t.transaction_type === "expense").reduce((sum, t) => sum + Number(t.amount), 0);
  const activeGoals = goals.filter(goal => goal.status === "active" && (selectedCurrency === "all" || accountMap.get(goal.account_id)?.currency === selectedCurrency));
  const incomeByCurrency = currencies.map(currency => ({
    currency,
    amount: periodTransactions.filter(t => t.transaction_type === "income" && accountMap.get(t.account_id)?.currency === currency).reduce((sum, t) => sum + Number(t.amount), 0),
  })).filter(item => item.amount > 0);
  const expenseByCurrency = currencies.map(currency => ({
    currency,
    amount: periodTransactions.filter(t => t.transaction_type === "expense" && accountMap.get(t.account_id)?.currency === currency).reduce((sum, t) => sum + Number(t.amount), 0),
  })).filter(item => item.amount > 0);
  const goalsByCurrency = currencies.map(currency => ({
    currency,
    saved: activeGoals.filter(goal => accountMap.get(goal.account_id)?.currency === currency).reduce((sum, goal) => sum + Number(goal.current_amount), 0),
    target: activeGoals.filter(goal => accountMap.get(goal.account_id)?.currency === currency).reduce((sum, goal) => sum + Number(goal.target_amount), 0),
  })).filter(item => item.saved > 0 || item.target > 0);
  const balanceByCurrency = currencies.filter(currency => selectedCurrency === "all" || currency === selectedCurrency).map(currency => ({
    currency,
    total: balances.filter(account => account.currency === currency).reduce((sum, account) => sum + account.balance, 0),
  }));
  const chartRows = useMemo(() => {
    if (!now) return [];
    return Array.from({ length: 6 }, (_, index) => {
      const month = new Date(now.getFullYear(), now.getMonth() - 5 + index, 1);
      const key = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}`;
      const rows = transactions.filter(t => t.transaction_date.startsWith(key) && t.transaction_type !== "transfer" && (selectedCurrency === "all" || accountMap.get(t.account_id)?.currency === selectedCurrency));
      return {
        label: month.toLocaleDateString("en-PH", { month: "short" }),
        income: rows.filter(t => t.transaction_type === "income").reduce((sum, t) => sum + Number(t.amount), 0),
        expense: rows.filter(t => t.transaction_type === "expense").reduce((sum, t) => sum + Number(t.amount), 0),
      };
    });
  }, [now, transactions, selectedCurrency, accountMap]);
  const categoryRows = useMemo(() => {
    const totals = new Map<string, { name: string; amount: number; currency: string }>();
    periodTransactions.filter(t => t.transaction_type === "expense").forEach(t => {
      const name = t.category?.trim() || "Uncategorized";
      const currency = accountMap.get(t.account_id)?.currency ?? "PHP";
      const key = `${currency}::${name}`;
      const current = totals.get(key) ?? { name, amount: 0, currency };
      current.amount += Number(t.amount);
      totals.set(key, current);
    });
    return Array.from(totals.values()).sort((a, b) => b.amount - a.amount).slice(0, 5);
  }, [periodTransactions, accountMap]);
  const categoryTotalsByCurrency = new Map<string, number>();
  categoryRows.forEach(row => categoryTotalsByCurrency.set(row.currency, (categoryTotalsByCurrency.get(row.currency) ?? 0) + row.amount));
  const budgetRows = budgets.filter(b => selectedCurrency === "all" || accountMap.get(b.account_id)?.currency === selectedCurrency).map(budget => {
    const window = now ? budgetWindow(budget, now) : null;
    const spent = window ? transactions.filter(t => t.account_id === budget.account_id && t.transaction_type === "expense" && t.category?.toLowerCase() === budget.category.toLowerCase() && t.transaction_date >= window.start && t.transaction_date <= window.end).reduce((sum, t) => sum + Number(t.amount), 0) : 0;
    return { ...budget, window, spent, currency: accountMap.get(budget.account_id)?.currency ?? "PHP" };
  }).filter(b => b.window).sort((a, b) => (b.spent / Number(b.amount)) - (a.spent / Number(a.amount))).slice(0, 4);
  const upcomingSubscriptions = subscriptions.filter(s => selectedCurrency === "all" || accountMap.get(s.account_id)?.currency === selectedCurrency).slice(0, 5);
  const recentTransactions = transactions.filter(t => selectedCurrency === "all" || accountMap.get(t.account_id)?.currency === selectedCurrency).slice(0, 6);
  const dueSoonCount = now ? upcomingSubscriptions.filter(s => {
    const days = (new Date(s.next_billing_date + "T00:00:00Z").getTime() - dateOnly(now).getTime()) / 86400000;
    return days >= 0 && days <= 7;
  }).length : 0;
  const defaultCurrency = currencies.length === 1 ? currencies[0] : "PHP";

  return <Stack spacing={3}>
    <Stack direction={{ xs: "column", md: "row" }} alignItems={{ xs: "stretch", md: "center" }} justifyContent="space-between" spacing={2}>
      <Box>
        <Typography variant="h4" fontWeight={850} letterSpacing={-1}>Your money at a glance.</Typography>
        <Typography color="text.secondary" sx={{ mt: 0.7 }}>A clear picture of what came in, what went out, and what you’re working toward.</Typography>
      </Box>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
        <FormControl size="small" sx={{ minWidth: 145 }}>
          <Select value={period} onChange={event => setPeriod(event.target.value as Period)} aria-label="Reporting period">
            {periodOptions.map(option => <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>)}
          </Select>
        </FormControl>
        {currencies.length > 1 && <FormControl size="small" sx={{ minWidth: 115 }}>
          <Select value={selectedCurrency} onChange={event => setCurrencyFilter(event.target.value)} aria-label="Currency filter">
            <MenuItem value="all">All currencies</MenuItem>{currencies.map(currency => <MenuItem key={currency} value={currency}>{currency}</MenuItem>)}
          </Select>
        </FormControl>}
        <Button variant="contained" component={Link} href="/transactions" sx={{ bgcolor: "primary.main", color: "primary.contrastText", fontWeight: 750, textTransform: "none", "&:hover": { bgcolor: "primary.dark" }, "&:focus-visible": { outline: "3px solid", outlineColor: "primary.light", outlineOffset: 2 } }}>Add transaction</Button>
        <Button color="inherit" variant="outlined" onClick={() => void loadData()} disabled={loading} aria-label="Refresh dashboard"><RefreshRounded /></Button>
      </Stack>
    </Stack>

    {error && <Alert severity="error">{error}</Alert>}
    {loading ? <Paper variant="outlined" sx={{ minHeight: 360, display: "grid", placeItems: "center", borderRadius: 3 }}><CircularProgress /></Paper> : <>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 6, xl: 3 }}><Card sx={{ height: "100%" }}><CardContent sx={{ p: 2.5, "&:last-child": { pb: 2.5 } }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between"><Typography variant="body2" color="text.secondary" fontWeight={650}>Current balance</Typography><Avatar variant="rounded" sx={{ bgcolor: "rgba(217,54,80,.12)", color: "primary.main" }}><AccountBalanceWalletOutlined /></Avatar></Stack>
          {balanceByCurrency.length ? balanceByCurrency.map(item => <Typography key={item.currency} variant="h5" fontWeight={850} sx={{ mt: 1.7 }}>{money(item.total, item.currency)}</Typography>) : <Typography variant="h5" fontWeight={850} sx={{ mt: 1.7 }}>{money(0, defaultCurrency)}</Typography>}
          <Typography variant="caption" color="text.secondary">{activeAccounts.length} active {activeAccounts.length === 1 ? "account" : "accounts"} · based on all transactions</Typography>
        </CardContent></Card></Grid>
        <Grid size={{ xs: 12, sm: 6, xl: 3 }}><Card sx={{ height: "100%" }}><CardContent sx={{ p: 2.5, "&:last-child": { pb: 2.5 } }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between"><Typography variant="body2" color="text.secondary" fontWeight={650}>Income</Typography><Avatar variant="rounded" sx={{ bgcolor: "rgba(37,167,122,.12)", color: "#25A77A" }}><ArrowDownwardRounded /></Avatar></Stack>
          {selectedCurrency === "all" && currencies.length > 1 ? (incomeByCurrency.length ? incomeByCurrency.map(item => <Typography key={item.currency} variant="h6" fontWeight={850} sx={{ mt: 1 }}>{money(item.amount, item.currency)}</Typography>) : <Typography variant="h5" fontWeight={850} sx={{ mt: 1.7 }}>—</Typography>) : <Typography variant="h5" fontWeight={850} sx={{ mt: 1.7 }}>{money(income, selectedCurrency === "all" ? defaultCurrency : selectedCurrency)}</Typography>}<Typography variant="caption" color="text.secondary">{periodOptions.find(p => p.value === period)?.label} · {periodTransactions.filter(t => t.transaction_type === "income").length} entries</Typography>
        </CardContent></Card></Grid>
        <Grid size={{ xs: 12, sm: 6, xl: 3 }}><Card sx={{ height: "100%" }}><CardContent sx={{ p: 2.5, "&:last-child": { pb: 2.5 } }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between"><Typography variant="body2" color="text.secondary" fontWeight={650}>Expenses</Typography><Avatar variant="rounded" sx={{ bgcolor: "rgba(240,139,101,.14)", color: "#E47B59" }}><ArrowUpwardRounded /></Avatar></Stack>
          {selectedCurrency === "all" && currencies.length > 1 ? (expenseByCurrency.length ? expenseByCurrency.map(item => <Typography key={item.currency} variant="h6" fontWeight={850} sx={{ mt: 1 }}>{money(item.amount, item.currency)}</Typography>) : <Typography variant="h5" fontWeight={850} sx={{ mt: 1.7 }}>—</Typography>) : <Typography variant="h5" fontWeight={850} sx={{ mt: 1.7 }}>{money(expenses, selectedCurrency === "all" ? defaultCurrency : selectedCurrency)}</Typography>}<Typography variant="caption" color="text.secondary">{periodOptions.find(p => p.value === period)?.label} · {periodTransactions.filter(t => t.transaction_type === "expense").length} entries</Typography>
        </CardContent></Card></Grid>
        <Grid size={{ xs: 12, sm: 6, xl: 3 }}><Card sx={{ height: "100%" }}><CardContent sx={{ p: 2.5, "&:last-child": { pb: 2.5 } }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between"><Typography variant="body2" color="text.secondary" fontWeight={650}>Active savings goals</Typography><Avatar variant="rounded" sx={{ bgcolor: "rgba(65,157,208,.13)", color: "#419DD0" }}><SavingsOutlined /></Avatar></Stack>
          <Typography variant="h5" fontWeight={850} sx={{ mt: 1.7 }}>{activeGoals.length}</Typography>{selectedCurrency === "all" && currencies.length > 1 ? <Stack spacing={0.2} sx={{ mt: 0.5 }}>{goalsByCurrency.map(item => <Typography key={item.currency} variant="caption" color="text.secondary">{money(item.saved, item.currency)} saved / {money(item.target, item.currency)} target</Typography>)}</Stack> : <Typography variant="caption" color="text.secondary">{money(activeGoals.reduce((sum, goal) => sum + Number(goal.current_amount), 0), selectedCurrency === "all" ? defaultCurrency : selectedCurrency)} saved toward {money(activeGoals.reduce((sum, goal) => sum + Number(goal.target_amount), 0), selectedCurrency === "all" ? defaultCurrency : selectedCurrency)}</Typography>}
        </CardContent></Card></Grid>
      </Grid>

      <Grid container spacing={2.5}>
        <Grid size={{ xs: 12, lg: 8 }}>
          <Paper variant="outlined" sx={{ p: { xs: 2, md: 2.8 }, height: "100%", borderRadius: 3 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1} sx={{ mb: 1 }}>
              <Box><Typography fontWeight={800} fontSize={16}>Cash flow</Typography><Typography variant="body2" color="text.secondary">Income vs expenses over the last six months</Typography></Box><ShowChartRounded color="action" />
            </Stack>
            {selectedCurrency === "all" && currencies.length > 1 ? <Alert severity="info">Choose a currency above to view cash flow without combining different currencies.</Alert> : chartRows.some(r => r.income || r.expense) ? <CashFlowChart rows={chartRows} currency={selectedCurrency === "all" ? defaultCurrency : selectedCurrency} /> : <EmptyState title="Your cash flow starts here" detail="Add income and expense transactions to see how money moves over time." href="/transactions" action="Add a transaction" />}
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, lg: 4 }}>
          <Paper variant="outlined" sx={{ p: { xs: 2, md: 2.8 }, height: "100%", borderRadius: 3 }}>
            <SectionTitle title="Spending by category" href="/transactions" action="Transactions" />
            {categoryRows.length ? <Stack spacing={1.7}>
              {categoryRows.map(row => <Box key={`${row.currency}-${row.name}`}>
                <Stack direction="row" justifyContent="space-between" spacing={1} sx={{ mb: 0.6 }}><Typography variant="body2" fontWeight={650} noWrap>{row.name}</Typography><Typography variant="body2" fontWeight={750}>{money(row.amount, row.currency)}</Typography></Stack>
                <LinearProgress variant="determinate" value={(categoryTotalsByCurrency.get(row.currency) ?? 0) ? row.amount / (categoryTotalsByCurrency.get(row.currency) ?? 1) * 100 : 0} sx={{ height: 8, borderRadius: 99, bgcolor: "action.hover", "& .MuiLinearProgress-bar": { borderRadius: 99 } }} />
              </Box>)}
            </Stack> : <EmptyState title="No spending yet" detail="Expense categories will appear here after you record spending." href="/transactions" action="Add an expense" />}
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, lg: 7 }}>
          <Paper variant="outlined" sx={{ p: { xs: 2, md: 2.8 }, borderRadius: 3 }}>
            <SectionTitle title="Budget progress" href="/budgets" />
            {budgetRows.length ? <Stack spacing={2}>
              {budgetRows.map(budget => {
                const percent = budget.amount > 0 ? budget.spent / Number(budget.amount) * 100 : 0;
                return <Box key={budget.id}>
                  <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={1}>
                    <Box sx={{ minWidth: 0 }}><Typography fontWeight={750} noWrap>{budget.name}</Typography><Typography variant="caption" color="text.secondary">{budget.category} · {accountMap.get(budget.account_id)?.name ?? "Account"}</Typography></Box>
                    <Chip size="small" color={percent > 100 ? "error" : percent >= 80 ? "warning" : "success"} label={percent > 100 ? "Over budget" : percent >= 80 ? "Near limit" : "On track"} />
                  </Stack>
                  <LinearProgress variant="determinate" value={Math.min(100, percent)} color={percent > 100 ? "error" : percent >= 80 ? "warning" : "success"} sx={{ height: 8, borderRadius: 99, mt: 1, bgcolor: "action.hover" }} />
                  <Stack direction="row" justifyContent="space-between" sx={{ mt: 0.5 }}><Typography variant="caption" color="text.secondary">{money(budget.spent, budget.currency)} spent</Typography><Typography variant="caption" color="text.secondary">of {money(Number(budget.amount), budget.currency)}</Typography></Stack>
                </Box>;
              })}
            </Stack> : <EmptyState title="No active budgets" detail="Set a spending limit to keep an eye on the categories that matter." href="/budgets" action="Create a budget" />}
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, lg: 5 }}>
          <Paper variant="outlined" sx={{ p: { xs: 2, md: 2.8 }, borderRadius: 3 }}>
            <SectionTitle title="Upcoming subscriptions" href="/subscriptions" />
            {upcomingSubscriptions.length ? <Stack divider={<Box sx={{ borderBottom: 1, borderColor: "divider" }} />} spacing={1.4}>
              {upcomingSubscriptions.map(subscription => {
                const days = now ? Math.round((new Date(subscription.next_billing_date + "T00:00:00Z").getTime() - dateOnly(now).getTime()) / 86400000) : 0;
                return <Stack key={subscription.id} direction="row" alignItems="center" spacing={1.2}>
                  <Avatar variant="rounded" sx={{ bgcolor: "action.hover", color: "primary.main" }}><EventRepeatRounded /></Avatar>
                  <Box sx={{ flex: 1, minWidth: 0 }}><Typography fontWeight={700} noWrap>{subscription.name}</Typography><Typography variant="caption" color="text.secondary">{accountMap.get(subscription.account_id)?.name ?? "Account"} · {days < 0 ? `Overdue by ${Math.abs(days)}d` : days === 0 ? "Due today" : `Due ${shortDate(subscription.next_billing_date)}`}</Typography></Box>
                  <Typography fontWeight={750} variant="body2">{money(Number(subscription.amount), accountMap.get(subscription.account_id)?.currency ?? "PHP")}</Typography>
                </Stack>;
              })}
            </Stack> : <EmptyState title="No upcoming subscriptions" detail="Active recurring services will show their next billing dates here." href="/subscriptions" action="Manage subscriptions" />}
            {dueSoonCount > 0 && <Alert severity="info" sx={{ mt: 2 }}>{dueSoonCount} {dueSoonCount === 1 ? "payment is" : "payments are"} due in the next 7 days.</Alert>}
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, lg: 5 }}>
          <Paper variant="outlined" sx={{ p: { xs: 2, md: 2.8 }, borderRadius: 3 }}>
            <SectionTitle title="Savings goals" href="/goals" />
            {activeGoals.length ? <Stack spacing={1.8}>
              {activeGoals.slice(0, 4).map(goal => {
                const percent = Number(goal.target_amount) > 0 ? Math.min(100, Number(goal.current_amount) / Number(goal.target_amount) * 100) : 0;
                const currency = accountMap.get(goal.account_id)?.currency ?? "PHP";
                return <Box key={goal.id}>
                  <Stack direction="row" justifyContent="space-between" spacing={1}><Typography fontWeight={700} noWrap>{goal.name}</Typography><Typography variant="caption" fontWeight={750}>{percent.toFixed(0)}%</Typography></Stack>
                  <LinearProgress variant="determinate" value={percent} color="success" sx={{ height: 8, borderRadius: 99, mt: 0.8, bgcolor: "action.hover" }} />
                  <Typography variant="caption" color="text.secondary">{money(Number(goal.current_amount), currency)} of {money(Number(goal.target_amount), currency)}</Typography>
                </Box>;
              })}
            </Stack> : <EmptyState title="No active goals" detail="Give your savings a purpose by setting a target." href="/goals" action="Create a goal" />}
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, lg: 7 }}>
          <Paper variant="outlined" sx={{ p: { xs: 2, md: 2.8 }, borderRadius: 3 }}>
            <SectionTitle title="Recent transactions" href="/transactions" />
            {recentTransactions.length ? <Stack spacing={0} divider={<Box sx={{ borderBottom: 1, borderColor: "divider" }} />}>
              {recentTransactions.map(transaction => {
                const isIncome = transaction.transaction_type === "income";
                const account = accountMap.get(transaction.account_id);
                return <Stack key={transaction.id} direction="row" alignItems="center" spacing={1.2} sx={{ py: 1.2 }}>
                  <Avatar variant="rounded" sx={{ bgcolor: isIncome ? "rgba(37,167,122,.12)" : "rgba(240,139,101,.13)", color: isIncome ? "success.main" : "error.main", width: 38, height: 38 }}>{isIncome ? <ArrowDownwardRounded fontSize="small" /> : transaction.transaction_type === "transfer" ? <WalletOutlined fontSize="small" /> : <ArrowUpwardRounded fontSize="small" />}</Avatar>
                  <Box sx={{ flex: 1, minWidth: 0 }}><Typography fontWeight={700} noWrap>{transaction.description || transaction.category || (transaction.transaction_type === "transfer" ? "Account transfer" : "Transaction")}</Typography><Typography variant="caption" color="text.secondary">{account?.name ?? "Account"} · {shortDate(transaction.transaction_date)}</Typography></Box>
                  <Typography fontWeight={800} color={isIncome ? "success.main" : transaction.transaction_type === "transfer" ? "text.primary" : "error.main"} sx={{ whiteSpace: "nowrap" }}>{isIncome ? "+" : transaction.transaction_type === "transfer" && transaction.transfer_direction === "in" ? "+" : "−"}{money(Number(transaction.amount), account?.currency ?? "PHP")}</Typography>
                </Stack>;
              })}
            </Stack> : <EmptyState title="No transactions yet" detail="Your latest income, expenses, and transfers will appear here." href="/transactions" action="Add a transaction" />}
          </Paper>
        </Grid>
      </Grid>
      {currencies.length > 1 && selectedCurrency === "all" && <Typography variant="caption" color="text.secondary">Totals are displayed separately by currency where applicable. Amounts from different currencies are never added together.</Typography>}
      {!accounts.length && <Alert severity="info" action={<Button component={Link} href="/accounts" color="inherit" size="small">Add account</Button>}>Start by adding a financial account. Transactions, budgets, and savings goals are linked to an account.</Alert>}
      <Typography variant="caption" color="text.secondary">Reporting period: {range ? `${shortDate(range.start)} – ${shortDate(range.end)}` : "Preparing"} · Cash-flow chart: last six calendar months.</Typography>
    </>}
  </Stack>;
}
