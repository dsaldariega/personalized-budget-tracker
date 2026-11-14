"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AddRounded, CalendarMonthRounded, DeleteOutlineRounded, EditOutlined,
  MoreHorizRounded, RefreshRounded, SavingsRounded, SearchRounded,
} from "@mui/icons-material";
import {
  Alert, Avatar, Box, Button, Chip, CircularProgress, Dialog, DialogActions,
  DialogContent, DialogTitle, Divider, IconButton, LinearProgress, Menu,
  MenuItem, Paper, Stack, TextField, Tooltip, Typography,
} from "@mui/material";
import { apiRequest } from "@/lib/api";
import { SuccessToast } from "@/components/success-toast";

type Period = "weekly" | "monthly" | "yearly" | "custom";
type Account = { id: string; name: string; currency: string; is_archived: boolean };
type Budget = {
  id: string; user_id: string; account_id: string; name: string; category: string;
  amount: number; period: Period; start_date: string; end_date: string | null;
  created_at: string;
};
type Expense = { account_id: string; category: string | null; amount: number; transaction_date: string; transaction_type: string };
type BudgetForm = {
  account_id: string; name: string; category: string; amount: string;
  period: Period; start_date: string; end_date: string;
};

const categories = [
  "Food & dining", "Groceries", "Transportation", "Housing",
  "Bills & utilities", "Shopping", "Health", "Education",
  "Entertainment", "Travel", "Personal care", "Family", "Other expense",
];
const today = () => {
  const d = new Date();
  return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, "0"), String(d.getDate()).padStart(2, "0")].join("-");
};
const emptyForm = (): BudgetForm => ({
  account_id: "", name: "", category: "Food & dining", amount: "",
  period: "monthly", start_date: today(), end_date: "",
});
const parseDate = (value: string) => {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
};
const dateString = (value: Date) => [value.getUTCFullYear(), String(value.getUTCMonth() + 1).padStart(2, "0"), String(value.getUTCDate()).padStart(2, "0")].join("-");
const addDays = (value: Date, days: number) => new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate() + days));
const monthDate = (year: number, month: number, day: number) => new Date(Date.UTC(year, month, Math.min(day, new Date(Date.UTC(year, month + 1, 0)).getUTCDate())));
const yearDate = (year: number, month: number, day: number) => monthDate(year, month, day);

function budgetWindow(budget: Budget, todayValue = today()) {
  const anchor = parseDate(budget.start_date);
  const current = parseDate(todayValue);
  if (current < anchor) return { start: budget.start_date, end: budget.end_date ?? budget.start_date, state: "upcoming" as const };
  const expired = Boolean(budget.end_date && current > parseDate(budget.end_date));
  const reference = expired ? parseDate(budget.end_date!) : current;
  if (budget.period === "custom") return { start: budget.start_date, end: budget.end_date ?? budget.start_date, state: expired ? "ended" as const : "active" as const };
  let start = anchor;
  let end = anchor;
  if (budget.period === "weekly") {
    const elapsed = Math.floor((reference.getTime() - anchor.getTime()) / 86400000);
    start = addDays(anchor, Math.floor(elapsed / 7) * 7);
    end = addDays(start, 6);
  } else if (budget.period === "monthly") {
    const months = (reference.getUTCFullYear() - anchor.getUTCFullYear()) * 12 + reference.getUTCMonth() - anchor.getUTCMonth();
    const candidate = monthDate(anchor.getUTCFullYear(), anchor.getUTCMonth() + months, anchor.getUTCDate());
    start = candidate > reference ? monthDate(anchor.getUTCFullYear(), anchor.getUTCMonth() + months - 1, anchor.getUTCDate()) : candidate;
    end = addDays(monthDate(start.getUTCFullYear(), start.getUTCMonth() + 1, anchor.getUTCDate()), -1);
  } else {
    const years = reference.getUTCFullYear() - anchor.getUTCFullYear();
    const candidate = yearDate(anchor.getUTCFullYear() + years, anchor.getUTCMonth(), anchor.getUTCDate());
    start = candidate > reference ? yearDate(anchor.getUTCFullYear() + years - 1, anchor.getUTCMonth(), anchor.getUTCDate()) : candidate;
    end = addDays(yearDate(start.getUTCFullYear() + 1, anchor.getUTCMonth(), anchor.getUTCDate()), -1);
  }
  if (budget.end_date && end > parseDate(budget.end_date)) end = parseDate(budget.end_date);
  return { start: dateString(start), end: dateString(end), state: expired ? "ended" as const : "active" as const };
}
function money(amount: number, currency: string) {
  try { return new Intl.NumberFormat("en-PH", { style: "currency", currency, maximumFractionDigits: 2 }).format(amount); }
  catch { return currency + " " + amount.toLocaleString("en-PH", { maximumFractionDigits: 2 }); }
}
function dateLabel(value: string) {
  return parseDate(value).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" });
}
function periodLabel(period: Period) {
  return ({ weekly: "Weekly", monthly: "Monthly", yearly: "Yearly", custom: "Custom dates" })[period];
}

function BudgetDialog({
  open, accounts, initial, saving, onClose, onSave,
}: {
  open: boolean; accounts: Account[]; initial: BudgetForm; saving: boolean;
  onClose: () => void; onSave: (value: BudgetForm) => void;
}) {
  const [form, setForm] = useState(initial);
  const [formError, setFormError] = useState("");
  useEffect(() => { if (open) { setForm(initial); setFormError(""); } }, [initial, open]);
  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const amount = Number(form.amount);
    if (!form.account_id) return setFormError("Choose an account for this budget.");
    if (!form.name.trim()) return setFormError("Enter a budget name.");
    if (!Number.isFinite(amount) || amount <= 0) return setFormError("Enter an amount greater than zero.");
    if (!form.start_date) return setFormError("Choose a start date.");
    if (form.period === "custom" && !form.end_date) return setFormError("Choose an end date for a custom budget.");
    if (form.end_date && form.end_date < form.start_date) return setFormError("The end date cannot be before the start date.");
    onSave({ ...form, name: form.name.trim(), amount: String(amount) });
  }
  return (
    <Dialog scroll="paper" open={open} onClose={saving ? undefined : onClose} fullWidth maxWidth="sm">
      <Box component="form" onSubmit={submit} sx={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
        <DialogTitle sx={{ fontWeight: 700 }}>{initial.name ? "Edit budget" : "Create a budget"}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Set a spending limit for a category and track expenses from the selected account.</Typography>
          <Stack spacing={2}>
            <TextField label="Budget name" placeholder="e.g. Monthly groceries" value={form.name} onChange={(e) => setForm(v => ({ ...v, name: e.target.value }))} fullWidth required inputProps={{ maxLength: 100 }} />
            <TextField select label="Account" value={form.account_id} onChange={(e) => setForm(v => ({ ...v, account_id: e.target.value }))} fullWidth>
              {accounts.map(a => <MenuItem key={a.id} value={a.id}>{a.name} · {a.currency}</MenuItem>)}
            </TextField>
            <TextField select label="Expense category" value={form.category} onChange={(e) => setForm(v => ({ ...v, category: e.target.value }))} fullWidth>
              {categories.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
            </TextField>
            <TextField label="Budget amount" type="number" value={form.amount} onChange={(e) => setForm(v => ({ ...v, amount: e.target.value }))} fullWidth required inputProps={{ min: "0.01", step: "0.01" }} InputProps={{ startAdornment: <Typography color="text.secondary" sx={{ mr: 1 }}>{accounts.find(a => a.id === form.account_id)?.currency ?? "¤"}</Typography> }} />
            <TextField select label="Budget period" value={form.period} onChange={(e) => setForm(v => ({ ...v, period: e.target.value as Period, end_date: e.target.value === "custom" ? v.end_date : "" }))} fullWidth>
              <MenuItem value="weekly">Weekly (repeats every 7 days)</MenuItem>
              <MenuItem value="monthly">Monthly (repeats monthly)</MenuItem>
              <MenuItem value="yearly">Yearly (repeats annually)</MenuItem>
              <MenuItem value="custom">Custom date range</MenuItem>
            </TextField>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField label="Start date" type="date" value={form.start_date} onChange={(e) => setForm(v => ({ ...v, start_date: e.target.value }))} fullWidth InputLabelProps={{ shrink: true }} />
              {form.period === "custom" ? <TextField label="End date" type="date" value={form.end_date} onChange={(e) => setForm(v => ({ ...v, end_date: e.target.value }))} fullWidth InputLabelProps={{ shrink: true }} /> : <TextField label="End date (optional)" type="date" value={form.end_date} onChange={(e) => setForm(v => ({ ...v, end_date: e.target.value }))} fullWidth InputLabelProps={{ shrink: true }} helperText="Optional expiry date for this budget" />}
            </Stack>
            {formError && <Alert severity="error">{formError}</Alert>}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button color="inherit" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={saving}>{saving ? <CircularProgress size={18} color="inherit" /> : "Save budget"}</Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}

export function BudgetsManager() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Budget | null>(null);
  const [form, setForm] = useState<BudgetForm>(emptyForm());
  const [menu, setMenu] = useState<{ element: HTMLElement; budget: Budget } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Budget | null>(null);
  const [search, setSearch] = useState("");
  const [accountFilter, setAccountFilter] = useState("all");
  const [periodFilter, setPeriodFilter] = useState("all");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await apiRequest<{ accounts: Account[]; budgets: Budget[]; expenses: Expense[] }>("/budgets");
      setAccounts(data.accounts);
      setBudgets(data.budgets);
      setExpenses(data.expenses);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load budgets.");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { void loadData(); }, [loadData]);

  function openCreate() {
    setEditing(null);
    setForm({ ...emptyForm(), account_id: accounts.find(a => !a.is_archived)?.id ?? "" });
    setDialogOpen(true);
  }
  function openEdit(budget: Budget) {
    setEditing(budget);
    setForm({ account_id: budget.account_id, name: budget.name, category: budget.category, amount: String(budget.amount), period: budget.period, start_date: budget.start_date, end_date: budget.end_date ?? "" });
    setMenu(null); setDialogOpen(true);
  }
  async function saveBudget(value: BudgetForm) {
    setSaving(true);
    setError("");
    setNotice("");
    const payload = {
      account_id: value.account_id,
      name: value.name,
      category: value.category,
      amount: Number(value.amount),
      period: value.period,
      start_date: value.start_date,
      end_date: value.end_date || null,
    };
    try {
      await apiRequest<{ budget: Budget }>(
        editing ? `/budgets/${editing.id}` : "/budgets",
        {
          method: editing ? "PUT" : "POST",
          body: JSON.stringify(payload),
        },
      );
      setDialogOpen(false);
      setNotice(editing ? "Budget updated." : "Budget created.");
      await loadData();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to save budget.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteBudget() {
    if (!deleteTarget) return;
    setSaving(true);
    setError("");
    try {
      await apiRequest<void>(`/budgets/${deleteTarget.id}`, { method: "DELETE" });
      setDeleteTarget(null);
      setNotice("Budget deleted.");
      await loadData();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to delete budget.");
      setDeleteTarget(null);
    } finally {
      setSaving(false);
    }
  }

  const accountById = useMemo(() => new Map(accounts.map(a => [a.id, a])), [accounts]);
  const rows = budgets.map(budget => {
    const window = budgetWindow(budget);
    const spent = expenses.filter(e => e.account_id === budget.account_id && e.category === budget.category && e.transaction_date >= window.start && e.transaction_date <= window.end)
      .reduce((sum, e) => sum + Number(e.amount), 0);
    const account = accountById.get(budget.account_id);
    return { budget, window, spent, account, remaining: Number(budget.amount) - spent, progress: Math.min(100, spent / Number(budget.amount) * 100) };
  });
  const filtered = rows.filter(row =>
    (accountFilter === "all" || row.budget.account_id === accountFilter) &&
    (periodFilter === "all" || row.budget.period === periodFilter) &&
    (!search || [row.budget.name, row.budget.category, row.account?.name].join(" ").toLowerCase().includes(search.toLowerCase()))
  );
  const activeRows = rows.filter(r => r.window.state === "active");
  const totals = new Map<string, { budget: number; spent: number }>();
  activeRows.forEach(r => {
    const currency = r.account?.currency ?? "PHP";
    const item = totals.get(currency) ?? { budget: 0, spent: 0 };
    item.budget += Number(r.budget.amount); item.spent += r.spent; totals.set(currency, item);
  });
  const totalLabels = Array.from(totals, ([currency, item]) => `${money(item.spent, currency)} / ${money(item.budget, currency)}`).join(" · ") || "—";

  return (
    <Stack spacing={3}>
      <Stack direction={{ xs: "column", sm: "row" }} alignItems={{ xs: "stretch", sm: "center" }} justifyContent="space-between" spacing={2}>
        <Box><Typography variant="h4" fontWeight={700} letterSpacing={-0.8}>Budgets</Typography><Typography color="text.secondary" sx={{ mt: 0.7 }}>Give every spending category a limit, and keep an eye on your progress.</Typography></Box>
        <Button variant="contained" startIcon={<AddRounded />} onClick={openCreate} disabled={accounts.every(a => a.is_archived)}>Create budget</Button>
      </Stack>
      {error && <Alert severity="error" onClose={() => setError("")}>{error}</Alert>}
      <SuccessToast message={notice} onClose={() => setNotice("")} />
      {accounts.every(a => a.is_archived) && !loading && <Alert severity="info" action={<Button color="inherit" size="small" onClick={() => window.location.assign("/accounts")}>Go to accounts</Button>}>Add an active account before creating a budget.</Alert>}
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(2,minmax(0,1fr))" }, gap: 2 }}>
        <Paper variant="outlined" sx={{ p: 2.3, borderRadius: 1.5 }}><Stack direction="row" alignItems="center" spacing={1.3}><Avatar sx={{ bgcolor: "action.hover", color: "primary.main" }}><SavingsRounded /></Avatar><Box><Typography variant="caption" color="text.secondary">Active budget limits</Typography><Typography variant="h6" fontWeight={700}>{activeRows.length}</Typography></Box></Stack></Paper>
        <Paper variant="outlined" sx={{ p: 2.3, borderRadius: 1.5 }}><Stack direction="row" alignItems="center" spacing={1.3}><Avatar sx={{ bgcolor: "action.hover", color: "success.main" }}><CalendarMonthRounded /></Avatar><Box><Typography variant="caption" color="text.secondary">Spent / budget limits this period</Typography><Typography variant="h6" fontWeight={700} sx={{ fontSize: { xs: 18, sm: 21 } }}>{totalLabels}</Typography></Box></Stack></Paper>
      </Box>
      <Stack direction={{ xs: "column", md: "row" }} alignItems={{ xs: "stretch", md: "center" }} justifyContent="space-between" spacing={1.5}>
        <Box><Typography variant="h6" fontWeight={700}>Your budgets</Typography><Typography variant="body2" color="text.secondary">{filtered.length} {filtered.length === 1 ? "budget" : "budgets"}</Typography></Box>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ xs: "stretch", sm: "center" }} sx={{ width: { xs: "100%", md: "auto" }, "& > .MuiFormControl-root, & > .MuiTextField-root": { width: { xs: "100%", sm: "auto" }, minWidth: { sm: 135 } } }}>
          <TextField size="small" placeholder="Search budgets" sx={{ minWidth: { sm: 220 } }} value={search} onChange={e => setSearch(e.target.value)} InputProps={{ startAdornment: <SearchRounded fontSize="small" sx={{ mr: 1, color: "text.secondary" }} /> }} />
          <TextField select size="small" label="Account" value={accountFilter} onChange={e => setAccountFilter(e.target.value)} sx={{ minWidth: { sm: 150 } }}><MenuItem value="all">All accounts</MenuItem>{accounts.map(a => <MenuItem key={a.id} value={a.id}>{a.name}</MenuItem>)}</TextField>
          <TextField select size="small" label="Period" value={periodFilter} onChange={e => setPeriodFilter(e.target.value)} sx={{ minWidth: { sm: 135 } }}><MenuItem value="all">All periods</MenuItem>{(["weekly","monthly","yearly","custom"] as Period[]).map(p => <MenuItem key={p} value={p}>{periodLabel(p)}</MenuItem>)}</TextField>
          <Tooltip title="Refresh"><IconButton onClick={() => void loadData()} disabled={loading}><RefreshRounded /></IconButton></Tooltip>
        </Stack>
      </Stack>
      {loading ? <Paper sx={{ minHeight: 220, display: "grid", placeItems: "center", borderRadius: 1.5 }}><CircularProgress size={28} /></Paper> : filtered.length === 0 ? (
        <Paper variant="outlined" sx={{ p: { xs: 3, md: 5 }, minHeight: 250, display: "grid", placeItems: "center", textAlign: "center", borderRadius: 1.5 }}>
          <Stack alignItems="center" spacing={1.2} sx={{ maxWidth: 400 }}><Avatar variant="rounded" sx={{ width: 58, height: 58, bgcolor: "action.hover", color: "text.secondary" }}><SavingsRounded fontSize="large" /></Avatar><Typography variant="h6">{budgets.length ? "No matching budgets" : "Start with a spending plan"}</Typography><Typography color="text.secondary" variant="body2">{budgets.length ? "Try adjusting your filters." : "Create a budget for a category, choose an account, and BudgetNest will track matching expenses automatically."}</Typography>{budgets.length === 0 && !accounts.every(a => a.is_archived) && <Button variant="contained" startIcon={<AddRounded />} onClick={openCreate} sx={{ mt: 1 }}>Create your first budget</Button>}</Stack>
        </Paper>
      ) : (
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "repeat(2,minmax(0,1fr))" }, gap: 2 }}>
          {filtered.map(({ budget, window, spent, account, remaining, progress }) => (
            <Paper key={budget.id} variant="outlined" sx={{ p: { xs: 2, sm: 2.4 }, borderRadius: 1.5, minWidth: 0 }}>
              <Stack direction="row" spacing={1.2} alignItems="flex-start">
                <Avatar variant="rounded" sx={{ bgcolor: "action.hover", color: "primary.main" }}><SavingsRounded /></Avatar>
                <Box sx={{ flex: 1, minWidth: 0 }}><Typography fontWeight={700}>{budget.name}</Typography><Typography variant="body2" color="text.secondary">{budget.category} · {account?.name ?? "Unknown account"}</Typography></Box>
                <IconButton size="small" aria-label="Budget actions" onClick={e => setMenu({ element: e.currentTarget, budget })}><MoreHorizRounded /></IconButton>
              </Stack>
              <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mt: 2.2, mb: 0.8 }}>
                <Typography variant="body2" color="text.secondary">{window.state === "upcoming" ? "Starts" : window.state === "ended" ? "Ended" : "Spent this period"}</Typography>
                <Chip size="small" variant="outlined" label={periodLabel(budget.period)} />
              </Stack>
              <Typography variant="h5" fontWeight={700} letterSpacing={-0.5}>{money(spent, account?.currency ?? "PHP")} <Typography component="span" color="text.secondary" variant="body2" fontWeight={500}>of {money(Number(budget.amount), account?.currency ?? "PHP")}</Typography></Typography>
              <LinearProgress variant="determinate" value={window.state === "upcoming" ? 0 : progress} color={spent > Number(budget.amount) ? "error" : progress >= 80 ? "warning" : "primary"} sx={{ height: 9, borderRadius: 99, mt: 1.6, bgcolor: "action.hover" }} />
              <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ xs: "flex-start", sm: "center" }} spacing={0.5} sx={{ mt: 1.2 }}>
                <Typography variant="caption" color="text.secondary">{window.state === "upcoming" ? `Begins ${dateLabel(window.start)}` : window.state === "ended" ? `Ended ${dateLabel(window.end)}` : `${dateLabel(window.start)} – ${dateLabel(window.end)}`}</Typography>
                <Typography variant="body2" fontWeight={600} color={remaining < 0 ? "error.main" : "text.primary"}>{window.state === "active" ? remaining >= 0 ? `${money(remaining, account?.currency ?? "PHP")} left` : `${money(Math.abs(remaining), account?.currency ?? "PHP")} over` : window.state === "upcoming" ? "Not started" : "Completed period"}</Typography>
              </Stack>
            </Paper>
          ))}
        </Box>
      )}
      <Menu anchorEl={menu?.element ?? null} open={Boolean(menu)} onClose={() => setMenu(null)}>
        <MenuItem onClick={() => menu && openEdit(menu.budget)}><EditOutlined fontSize="small" sx={{ mr: 1 }} /> Edit budget</MenuItem>
        <MenuItem sx={{ color: "error.main" }} onClick={() => { setDeleteTarget(menu?.budget ?? null); setMenu(null); }}><DeleteOutlineRounded fontSize="small" sx={{ mr: 1 }} /> Delete budget</MenuItem>
      </Menu>
      <BudgetDialog open={dialogOpen} accounts={accounts.filter(a => !a.is_archived || a.id === editing?.account_id)} initial={form} saving={saving} onClose={() => setDialogOpen(false)} onSave={saveBudget} />
      <Dialog scroll="paper" open={Boolean(deleteTarget)} onClose={() => !saving && setDeleteTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Delete this budget?</DialogTitle>
        <DialogContent><Typography variant="body2" color="text.secondary">This removes the budget limit. Your transactions will not be affected.</Typography></DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}><Button color="inherit" onClick={() => setDeleteTarget(null)} disabled={saving}>Cancel</Button><Button color="error" variant="contained" onClick={() => void deleteBudget()} disabled={saving}>{saving ? <CircularProgress size={18} color="inherit" /> : "Delete"}</Button></DialogActions>
      </Dialog>
    </Stack>
  );
}
