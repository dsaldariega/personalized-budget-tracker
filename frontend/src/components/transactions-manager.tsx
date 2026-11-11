"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AddRounded, ArrowDownwardRounded, ArrowUpwardRounded, CompareArrowsRounded,
  DeleteOutlineRounded, EditOutlined, FilterAltOffRounded, MoreHorizRounded,
  RefreshRounded, SearchRounded, SwapHorizRounded,
} from "@mui/icons-material";
import {
  Alert, Avatar, Box, Button, Chip, CircularProgress, Dialog, DialogActions,
  DialogContent, DialogTitle, Divider, FormControl, IconButton, InputAdornment,
  InputLabel, Menu, MenuItem, Paper, Select, Stack, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, TextField, Tooltip, Typography,
} from "@mui/material";
import { createClient } from "@/lib/supabase/client";

type TransactionType = "income" | "expense" | "transfer";
type TransferDirection = "in" | "out";
type Account = { id: string; name: string; currency: string; opening_balance: number; is_archived: boolean };
type Transaction = {
  id: string; user_id: string; account_id: string; transaction_type: TransactionType;
  amount: number; category: string | null; description: string | null;
  transaction_date: string; transfer_group_id: string | null;
  transfer_direction: TransferDirection | null; created_at: string;
};
type FormValue = {
  transaction_type: TransactionType; account_id: string; destination_account_id: string;
  amount: string; category: string; description: string; transaction_date: string;
};
const categories: Record<"income" | "expense", string[]> = {
  income: ["Salary", "Business", "Freelance", "Investment", "Gift", "Other income"],
  expense: ["Food & dining", "Groceries", "Transportation", "Housing", "Bills & utilities", "Shopping", "Health", "Education", "Entertainment", "Travel", "Personal care", "Family", "Other expense"],
};
const todayLocal = () => {
  const now = new Date();
  return [now.getFullYear(), String(now.getMonth() + 1).padStart(2, "0"), String(now.getDate()).padStart(2, "0")].join("-");
};
const blankForm = (): FormValue => ({
  transaction_type: "expense", account_id: "", destination_account_id: "",
  amount: "", category: "Food & dining", description: "", transaction_date: todayLocal(),
});
function money(amount: number, currency: string) {
  try { return new Intl.NumberFormat("en-PH", { style: "currency", currency, maximumFractionDigits: 2 }).format(amount); }
  catch { return currency + " " + amount.toLocaleString("en-PH", { maximumFractionDigits: 2 }); }
}
function dateLabel(value: string) {
  return new Date(value + "T00:00:00").toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" });
}

function TransactionDialog({
  open, accounts, initial, saving, onClose, onSave,
}: {
  open: boolean; accounts: Account[]; initial: FormValue; saving: boolean;
  onClose: () => void; onSave: (value: FormValue) => void;
}) {
  const [form, setForm] = useState(initial);
  const [formError, setFormError] = useState("");
  useEffect(() => { if (open) { setForm(initial); setFormError(""); } }, [initial, open]);
  const availableDestinations = accounts.filter((a) => a.id !== form.account_id);
  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const amount = Number(form.amount);
    if (!form.transaction_date) return setFormError("Choose a transaction date.");
    if (!form.account_id) return setFormError("Choose an account for this transaction.");
    if (!Number.isFinite(amount) || amount <= 0) return setFormError("Enter an amount greater than zero.");
    if (form.transaction_type === "transfer" && !form.destination_account_id) return setFormError("Choose a destination account.");
    if (form.transaction_type === "transfer" && form.account_id === form.destination_account_id) return setFormError("Source and destination accounts must be different.");
    if (form.transaction_type !== "transfer" && !form.category.trim()) return setFormError("Choose a category.");
    onSave({ ...form, amount: String(amount), category: form.transaction_type === "transfer" ? "" : form.category.trim(), description: form.description.trim() });
  }
  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} fullWidth maxWidth="sm">
      <Box component="form" onSubmit={submit}>
        <DialogTitle sx={{ fontWeight: 800 }}>{initial.account_id ? "Edit transaction" : "Add a transaction"}</DialogTitle>
        <DialogContent>
          <Typography color="text.secondary" variant="body2" sx={{ mb: 2 }}>Record money moving into, out of, or between your accounts.</Typography>
          <Stack spacing={2}>
            <FormControl fullWidth>
              <InputLabel id="transaction-type-label">Transaction type</InputLabel>
              <Select labelId="transaction-type-label" label="Transaction type" value={form.transaction_type}
                onChange={(e) => setForm((v) => ({ ...v, transaction_type: e.target.value as TransactionType, category: e.target.value === "income" ? "Salary" : "Food & dining" }))}>
                <MenuItem value="expense">Expense</MenuItem><MenuItem value="income">Income</MenuItem><MenuItem value="transfer">Transfer</MenuItem>
              </Select>
            </FormControl>
            <TextField select label={form.transaction_type === "transfer" ? "From account" : "Account"} value={form.account_id} onChange={(e) => setForm((v) => ({ ...v, account_id: e.target.value, destination_account_id: v.destination_account_id === e.target.value ? "" : v.destination_account_id }))} fullWidth>
              {accounts.map((a) => <MenuItem key={a.id} value={a.id}>{a.name} · {a.currency}</MenuItem>)}
            </TextField>
            {form.transaction_type === "transfer" && <TextField select label="To account" value={form.destination_account_id} onChange={(e) => setForm((v) => ({ ...v, destination_account_id: e.target.value }))} fullWidth>
              {availableDestinations.map((a) => <MenuItem key={a.id} value={a.id}>{a.name} · {a.currency}</MenuItem>)}
            </TextField>}
            <TextField label="Amount" type="number" value={form.amount} onChange={(e) => setForm((v) => ({ ...v, amount: e.target.value }))} fullWidth required inputProps={{ min: "0.01", step: "0.01" }}
              InputProps={{ startAdornment: <InputAdornment position="start">{accounts.find((a) => a.id === form.account_id)?.currency ?? "¤"}</InputAdornment> }} />
            {form.transaction_type !== "transfer" && <TextField select label="Category" value={form.category} onChange={(e) => setForm((v) => ({ ...v, category: e.target.value }))} fullWidth>
              {categories[form.transaction_type].map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
            </TextField>}
            <TextField label="Date" type="date" value={form.transaction_date} onChange={(e) => setForm((v) => ({ ...v, transaction_date: e.target.value }))} fullWidth InputLabelProps={{ shrink: true }} />
            <TextField label="Description (optional)" placeholder="Add a note..." value={form.description} onChange={(e) => setForm((v) => ({ ...v, description: e.target.value }))} fullWidth multiline minRows={2} inputProps={{ maxLength: 240 }} />
            {form.transaction_type === "transfer" && <Alert severity="info">Transfers are recorded as a matching outflow and inflow. Both accounts must use the same currency.</Alert>}
            {formError && <Alert severity="error">{formError}</Alert>}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button color="inherit" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={saving}>{saving ? <CircularProgress size={18} color="inherit" /> : "Save transaction"}</Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}

export function TransactionsManager() {
  const supabase = useMemo(() => createClient(), []);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [form, setForm] = useState<FormValue>(blankForm());
  const [menu, setMenu] = useState<{ element: HTMLElement; transaction: Transaction } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Transaction | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [accountFilter, setAccountFilter] = useState("all");
  const [monthFilter, setMonthFilter] = useState("all");

  const loadData = useCallback(async () => {
    if (!supabase) { setError("Supabase is not configured. Check your frontend environment variables."); setLoading(false); return; }
    setLoading(true); setError("");
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) { setError("Your session could not be verified. Please sign in again."); setLoading(false); return; }
    const [accountResult, transactionResult] = await Promise.all([
      supabase.from("accounts").select("id,name,currency,opening_balance,is_archived").eq("user_id", user.id).order("name"),
      supabase.from("transactions").select("id,user_id,account_id,transaction_type,amount,category,description,transaction_date,transfer_group_id,transfer_direction,created_at").eq("user_id", user.id).order("transaction_date", { ascending: false }).order("created_at", { ascending: false }),
    ]);
    if (accountResult.error) setError(accountResult.error.message);
    else setAccounts((accountResult.data ?? []) as Account[]);
    if (transactionResult.error) setError(transactionResult.error.message);
    else setTransactions((transactionResult.data ?? []) as Transaction[]);
    setLoading(false);
  }, [supabase]);
  useEffect(() => { void loadData(); }, [loadData]);

  function openCreate() {
    setEditing(null);
    const first = accounts.find((a) => !a.is_archived);
    setForm({ ...blankForm(), account_id: first?.id ?? "" });
    setDialogOpen(true);
  }
  function openEdit(item: Transaction) {
    if (item.transaction_type === "transfer") { setNotice("To change a transfer, delete it and create it again so both sides stay matched."); setMenu(null); return; }
    setEditing(item);
    setForm({ transaction_type: item.transaction_type, account_id: item.account_id, destination_account_id: "", amount: String(item.amount), category: item.category ?? "", description: item.description ?? "", transaction_date: item.transaction_date });
    setMenu(null); setDialogOpen(true);
  }
  async function saveTransaction(value: FormValue) {
    if (!supabase) return;
    setSaving(true); setError(""); setNotice("");
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) { setError("Your session has expired. Please sign in again."); setSaving(false); return; }
    const source = accounts.find((a) => a.id === value.account_id);
    const destination = accounts.find((a) => a.id === value.destination_account_id);
    if (!source || source.is_archived) { setError("Choose an active account."); setSaving(false); return; }
    if (value.transaction_type === "transfer" && (!destination || destination.is_archived)) { setError("Choose an active destination account."); setSaving(false); return; }
    if (value.transaction_type === "transfer" && source.currency !== destination?.currency) { setError("Transfers between different currencies are not supported yet. Use accounts with the same currency."); setSaving(false); return; }
    const common = { user_id: user.id, amount: Number(value.amount), description: value.description || null, transaction_date: value.transaction_date };
    let saveError: { message: string } | null = null;
    if (editing) {
      const result = await supabase.from("transactions").update({ ...common, account_id: source.id, transaction_type: value.transaction_type, category: value.category }).eq("id", editing.id).eq("user_id", user.id);
      saveError = result.error;
    } else if (value.transaction_type === "transfer") {
      const groupId = crypto.randomUUID();
      const result = await supabase.from("transactions").insert([
        { ...common, account_id: source.id, transaction_type: "transfer", transfer_group_id: groupId, transfer_direction: "out", category: null },
        { ...common, account_id: destination!.id, transaction_type: "transfer", transfer_group_id: groupId, transfer_direction: "in", category: null },
      ]);
      saveError = result.error;
    } else {
      const result = await supabase.from("transactions").insert({ ...common, account_id: source.id, transaction_type: value.transaction_type, category: value.category, transfer_group_id: null, transfer_direction: null });
      saveError = result.error;
    }
    if (saveError) { setError(saveError.message); setSaving(false); return; }
    await supabase.from("activity_logs").insert({ user_id: user.id, action: editing ? "transaction.updated" : "transaction.created", entity_type: "transaction", entity_id: editing?.id ?? null, details: { transaction_type: value.transaction_type, amount: Number(value.amount), category: value.category || null } });
    setDialogOpen(false); setNotice(editing ? "Transaction updated." : "Transaction added."); setSaving(false); await loadData();
  }
  async function deleteTransaction() {
    if (!supabase || !deleteTarget) return;
    setSaving(true); setError("");
    const deleteResult = deleteTarget.transfer_group_id
      ? await supabase.from("transactions").delete().eq("transfer_group_id", deleteTarget.transfer_group_id)
      : await supabase.from("transactions").delete().eq("id", deleteTarget.id);
    if (deleteResult.error) { setError(deleteResult.error.message); setSaving(false); setDeleteTarget(null); return; }
    await supabase.from("activity_logs").insert({
      user_id: deleteTarget.user_id, action: "transaction.deleted", entity_type: "transaction",
      entity_id: deleteTarget.id, details: { transaction_type: deleteTarget.transaction_type, amount: Number(deleteTarget.amount), category: deleteTarget.category, transfer: Boolean(deleteTarget.transfer_group_id) },
    });
    setDeleteTarget(null); setNotice(deleteTarget.transfer_group_id ? "Transfer deleted from both accounts." : "Transaction deleted."); setSaving(false); await loadData();
  }

  const accountById = useMemo(() => new Map(accounts.map((a) => [a.id, a])), [accounts]);
  const activeAccounts = accounts.filter((a) => !a.is_archived);
  const filtered = transactions.filter((t) => {
    const account = accountById.get(t.account_id);
    const text = [t.category, t.description, account?.name].join(" ").toLowerCase();
    return (typeFilter === "all" || t.transaction_type === typeFilter)
      && (accountFilter === "all" || t.account_id === accountFilter)
      && (monthFilter === "all" || t.transaction_date.slice(0, 7) === monthFilter)
      && (!search || text.includes(search.toLowerCase()));
  });
  const months = Array.from(new Set(transactions.map((t) => t.transaction_date.slice(0, 7)))).sort().reverse();
  const monthStart = todayLocal().slice(0, 7);
  const currentMonth = transactions.filter((t) => t.transaction_date.slice(0, 7) === monthStart);
  const totalByCurrency = (items: Transaction[], type: "income" | "expense") => {
    const totals = new Map<string, number>();
    items.filter((t) => t.transaction_type === type).forEach((t) => {
      const currency = accountById.get(t.account_id)?.currency ?? "PHP";
      totals.set(currency, (totals.get(currency) ?? 0) + Number(t.amount));
    });
    return Array.from(totals, ([currency, amount]) => money(amount, currency)).join(" · ") || "—";
  };
  const balanceFor = (account: Account) => Number(account.opening_balance) + transactions.filter((t) => t.account_id === account.id).reduce((sum, t) => {
    if (t.transaction_type === "income" || (t.transaction_type === "transfer" && t.transfer_direction === "in")) return sum + Number(t.amount);
    return sum - Number(t.amount);
  }, 0);
  const monthsLabel = (m: string) => new Date(m + "-01T00:00:00").toLocaleDateString("en-PH", { month: "long", year: "numeric" });

  return (
    <Stack spacing={3}>
      <Stack direction={{ xs: "column", sm: "row" }} alignItems={{ xs: "stretch", sm: "center" }} justifyContent="space-between" spacing={2}>
        <Box><Typography variant="h4" fontWeight={800} letterSpacing={-0.8}>Transactions</Typography><Typography color="text.secondary" sx={{ mt: 0.7 }}>Track every peso coming in, going out, or moving between accounts.</Typography></Box>
        <Button variant="contained" color="primary" startIcon={<AddRounded />} onClick={openCreate} disabled={activeAccounts.length === 0} sx={{ bgcolor: "primary.main", color: "primary.contrastText", "&:hover": { bgcolor: "primary.dark" }, "&.Mui-disabled": { bgcolor: "action.disabledBackground", color: "action.disabled" } }}>Add transaction</Button>
      </Stack>
      {error && <Alert severity="error" onClose={() => setError("")}>{error}</Alert>}
      {notice && <Alert severity="success" onClose={() => setNotice("")}>{notice}</Alert>}
      {activeAccounts.length === 0 && !loading && <Alert severity="info" action={<Button color="inherit" size="small" onClick={() => window.location.assign("/accounts")}>Go to accounts</Button>}>Add an active account before recording transactions.</Alert>}
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(3,minmax(0,1fr))" }, gap: 2 }}>
        <Paper variant="outlined" sx={{ p: 2.3, borderRadius: 3 }}><Stack direction="row" spacing={1.2} alignItems="center"><Avatar sx={{ bgcolor: "success.light", color: "success.dark" }}><ArrowDownwardRounded /></Avatar><Box><Typography variant="caption" color="text.secondary">Income this month</Typography><Typography variant="h6" fontWeight={800}>{totalByCurrency(currentMonth, "income")}</Typography></Box></Stack></Paper>
        <Paper variant="outlined" sx={{ p: 2.3, borderRadius: 3 }}><Stack direction="row" spacing={1.2} alignItems="center"><Avatar sx={{ bgcolor: "error.light", color: "error.dark" }}><ArrowUpwardRounded /></Avatar><Box><Typography variant="caption" color="text.secondary">Expenses this month</Typography><Typography variant="h6" fontWeight={800}>{totalByCurrency(currentMonth, "expense")}</Typography></Box></Stack></Paper>
        <Paper variant="outlined" sx={{ p: 2.3, borderRadius: 3 }}><Stack direction="row" spacing={1.2} alignItems="center"><Avatar sx={{ bgcolor: "action.hover", color: "primary.main" }}><CompareArrowsRounded /></Avatar><Box><Typography variant="caption" color="text.secondary">Transactions this month</Typography><Typography variant="h6" fontWeight={800}>{currentMonth.filter((t) => t.transfer_direction !== "in").length}</Typography></Box></Stack></Paper>
      </Box>
      {activeAccounts.length > 0 && <Box>
        <Typography variant="h6" fontWeight={800} sx={{ mb: 1.5 }}>Account balances</Typography>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2,minmax(0,1fr))", xl: "repeat(3,minmax(0,1fr))" }, gap: 1.5 }}>
          {activeAccounts.map((a) => <Paper key={a.id} variant="outlined" sx={{ p: 2, borderRadius: 3 }}><Typography variant="body2" color="text.secondary">{a.name}</Typography><Typography variant="h6" fontWeight={800} sx={{ mt: .5 }}>{money(balanceFor(a), a.currency)}</Typography><Typography variant="caption" color="text.secondary">Starting balance + transactions</Typography></Paper>)}
        </Box>
      </Box>}
      <Stack direction={{ xs: "column", md: "row" }} alignItems={{ xs: "stretch", md: "center" }} justifyContent="space-between" spacing={1.5}>
        <Box><Typography variant="h6" fontWeight={800}>Transaction history</Typography><Typography variant="body2" color="text.secondary">{filtered.length} records</Typography></Box>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems="center">
          <TextField size="small" placeholder="Search transactions" value={search} onChange={(e) => setSearch(e.target.value)} InputProps={{ startAdornment: <InputAdornment position="start"><SearchRounded fontSize="small" /></InputAdornment> }} sx={{ minWidth: { sm: 220 } }} />
          <TextField select size="small" label="Type" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} sx={{ minWidth: 125 }}><MenuItem value="all">All types</MenuItem><MenuItem value="income">Income</MenuItem><MenuItem value="expense">Expense</MenuItem><MenuItem value="transfer">Transfer</MenuItem></TextField>
          <TextField select size="small" label="Account" value={accountFilter} onChange={(e) => setAccountFilter(e.target.value)} sx={{ minWidth: 150 }}><MenuItem value="all">All accounts</MenuItem>{accounts.map((a) => <MenuItem key={a.id} value={a.id}>{a.name}</MenuItem>)}</TextField>
          <TextField select size="small" label="Month" value={monthFilter} onChange={(e) => setMonthFilter(e.target.value)} sx={{ minWidth: 145 }}><MenuItem value="all">All time</MenuItem>{months.map((m) => <MenuItem key={m} value={m}>{monthsLabel(m)}</MenuItem>)}</TextField>
          <Tooltip title="Clear filters"><IconButton onClick={() => { setSearch(""); setTypeFilter("all"); setAccountFilter("all"); setMonthFilter("all"); }}><FilterAltOffRounded /></IconButton></Tooltip>
          <Tooltip title="Refresh"><IconButton onClick={() => void loadData()} disabled={loading}><RefreshRounded /></IconButton></Tooltip>
        </Stack>
      </Stack>
      {loading ? <Paper sx={{ minHeight: 220, display: "grid", placeItems: "center", borderRadius: 3 }}><CircularProgress size={28} /></Paper> : filtered.length === 0 ? (
        <Paper variant="outlined" sx={{ p: { xs: 3, md: 5 }, minHeight: 240, display: "grid", placeItems: "center", textAlign: "center", borderRadius: 3 }}>
          <Stack alignItems="center" spacing={1.2} sx={{ maxWidth: 390 }}><Avatar variant="rounded" sx={{ width: 58, height: 58, bgcolor: "action.hover", color: "text.secondary" }}><SwapHorizRounded fontSize="large" /></Avatar><Typography fontWeight={750} fontSize={18}>{transactions.length ? "No matching transactions" : "Your money story starts here"}</Typography><Typography color="text.secondary" variant="body2">{transactions.length ? "Try changing or clearing your filters." : "Record your first income, expense, or transfer to see your account balances update."}</Typography>{!transactions.length && activeAccounts.length > 0 && <Button variant="contained" color="primary" startIcon={<AddRounded />} onClick={openCreate} sx={{ mt: 1, bgcolor: "primary.main", color: "primary.contrastText", "&:hover": { bgcolor: "primary.dark" } }}>Add your first transaction</Button>}</Stack>
        </Paper>
      ) : (
        <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 3 }}>
          <Table size="medium">
            <TableHead><TableRow><TableCell>Date</TableCell><TableCell>Details</TableCell><TableCell>Account</TableCell><TableCell>Type</TableCell><TableCell align="right">Amount</TableCell><TableCell align="right"> </TableCell></TableRow></TableHead>
            <TableBody>{filtered.map((t) => {
              const account = accountById.get(t.account_id);
              const isTransfer = t.transaction_type === "transfer";
              const label = isTransfer ? (t.transfer_direction === "out" ? "Transfer out" : "Transfer in") : t.transaction_type;
              return <TableRow key={t.id} hover>
                <TableCell sx={{ whiteSpace: "nowrap" }}><Typography variant="body2">{dateLabel(t.transaction_date)}</Typography></TableCell>
                <TableCell sx={{ minWidth: 150 }}><Typography fontWeight={650} variant="body2">{t.category ?? (isTransfer ? "Account transfer" : "Uncategorised")}</Typography>{t.description && <Typography variant="caption" color="text.secondary">{t.description}</Typography>}</TableCell>
                <TableCell><Typography variant="body2">{account?.name ?? "Unknown account"}</Typography></TableCell>
                <TableCell><Chip size="small" label={label} color={t.transaction_type === "income" ? "success" : t.transaction_type === "expense" ? "error" : "default"} variant="outlined" /></TableCell>
                <TableCell align="right"><Typography variant="body2" fontWeight={750} color={t.transaction_type === "income" || (isTransfer && t.transfer_direction === "in") ? "success.main" : isTransfer ? "text.primary" : "error.main"}>{t.transaction_type === "income" || (isTransfer && t.transfer_direction === "in") ? "+" : "−"}{money(Number(t.amount), account?.currency ?? "PHP")}</Typography></TableCell>
                <TableCell align="right"><IconButton size="small" aria-label="Transaction actions" onClick={(e) => setMenu({ element: e.currentTarget, transaction: t })}><MoreHorizRounded /></IconButton></TableCell>
              </TableRow>;
            })}</TableBody>
          </Table>
        </TableContainer>
      )}
      <Menu anchorEl={menu?.element ?? null} open={Boolean(menu)} onClose={() => setMenu(null)}>
        <MenuItem onClick={() => menu && openEdit(menu.transaction)} disabled={menu?.transaction.transaction_type === "transfer"}><EditOutlined fontSize="small" sx={{ mr: 1 }} /> Edit transaction</MenuItem>
        <MenuItem sx={{ color: "error.main" }} onClick={() => { setDeleteTarget(menu?.transaction ?? null); setMenu(null); }}><DeleteOutlineRounded fontSize="small" sx={{ mr: 1 }} /> Delete{menu?.transaction.transfer_group_id ? " transfer" : " transaction"}</MenuItem>
      </Menu>
      <TransactionDialog open={dialogOpen} accounts={activeAccounts} initial={form} saving={saving} onClose={() => setDialogOpen(false)} onSave={saveTransaction} />
      <Dialog open={Boolean(deleteTarget)} onClose={() => !saving && setDeleteTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle fontWeight={800}>{deleteTarget?.transfer_group_id ? "Delete this transfer?" : "Delete this transaction?"}</DialogTitle>
        <DialogContent><Typography color="text.secondary" variant="body2">{deleteTarget?.transfer_group_id ? "This removes both matching entries from the source and destination accounts." : "This transaction will be permanently removed and the account balance will be recalculated."}</Typography></DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}><Button color="inherit" onClick={() => setDeleteTarget(null)} disabled={saving}>Cancel</Button><Button color="error" variant="contained" onClick={() => void deleteTransaction()} disabled={saving}>{saving ? <CircularProgress size={18} color="inherit" /> : "Delete"}</Button></DialogActions>
      </Dialog>
    </Stack>
  );
}
