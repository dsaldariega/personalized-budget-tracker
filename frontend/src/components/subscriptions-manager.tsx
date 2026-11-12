"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AddRounded, AutorenewRounded, CalendarMonthRounded, DeleteOutlineRounded,
  EditOutlined, HistoryRounded, MoreHorizRounded, RefreshRounded, SearchRounded,
  SubscriptionsRounded,
} from "@mui/icons-material";
import {
  Alert, Avatar, Box, Button, Chip, CircularProgress, Dialog, DialogActions,
  DialogContent, DialogTitle, Divider, IconButton, Menu, MenuItem, Paper,
  Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TextField, Tooltip, Typography,
} from "@mui/material";
import { apiRequest } from "@/lib/api";
import { SuccessToast } from "@/components/success-toast";

type Frequency = "weekly" | "monthly" | "quarterly" | "yearly";
type Account = { id: string; name: string; currency: string; is_archived: boolean };
type Subscription = {
  id: string; user_id: string; account_id: string; name: string; amount: number;
  billing_frequency: Frequency; next_billing_date: string; category: string | null;
  notes: string | null; is_active: boolean; created_at: string;
};
type Payment = {
  id: string; subscription_id: string; amount: number; billing_date: string;
  paid_date: string; notes: string | null;
};
type SubscriptionForm = {
  account_id: string; name: string; amount: string; billing_frequency: Frequency;
  next_billing_date: string; category: string; notes: string; is_active: boolean;
};
function todayLocal() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
const emptyForm = (): SubscriptionForm => ({
  account_id: "", name: "", amount: "", billing_frequency: "monthly",
  next_billing_date: todayLocal(),
  category: "Entertainment", notes: "", is_active: true,
});
const categories = ["Entertainment", "Music", "Video streaming", "Cloud storage", "Software", "Gaming", "Utilities", "Membership", "Other"];
function money(amount: number, currency: string) {
  try { return new Intl.NumberFormat("en-PH", { style: "currency", currency, maximumFractionDigits: 2 }).format(amount); }
  catch { return currency + " " + amount.toLocaleString("en-PH", { maximumFractionDigits: 2 }); }
}
function dateLabel(value: string) {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" });
}
function addBillingPeriod(value: string, frequency: Frequency) {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (frequency === "weekly") date.setUTCDate(date.getUTCDate() + 7);
  else {
    const months = frequency === "monthly" ? 1 : frequency === "quarterly" ? 3 : 12;
    const targetMonth = date.getUTCMonth() + months;
    const lastDay = new Date(Date.UTC(date.getUTCFullYear(), targetMonth + 1, 0)).getUTCDate();
    date.setUTCDate(1); date.setUTCMonth(targetMonth); date.setUTCDate(Math.min(day, lastDay));
  }
  return date.toISOString().slice(0, 10);
}
function daysUntil(value: string) {
  const [y, m, d] = value.split("-").map(Number);
  const due = Date.UTC(y, m - 1, d);
  const now = new Date();
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((due - today) / 86400000);
}

function SubscriptionDialog({
  open, accounts, initial, saving, onClose, onSave,
}: {
  open: boolean; accounts: Account[]; initial: SubscriptionForm; saving: boolean;
  onClose: () => void; onSave: (value: SubscriptionForm) => void;
}) {
  const [form, setForm] = useState(initial);
  const [formError, setFormError] = useState("");
  useEffect(() => { if (open) { setForm(initial); setFormError(""); } }, [initial, open]);
  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const amount = Number(form.amount);
    if (!form.account_id) return setFormError("Choose an account for this subscription.");
    if (!form.name.trim()) return setFormError("Enter the service or subscription name.");
    if (!Number.isFinite(amount) || amount <= 0) return setFormError("Enter an amount greater than zero.");
    if (!form.next_billing_date) return setFormError("Choose the next billing date.");
    onSave({ ...form, name: form.name.trim(), amount: String(amount), category: form.category.trim() });
  }
  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} fullWidth maxWidth="sm">
      <Box component="form" onSubmit={submit}>
        <DialogTitle sx={{ fontWeight: 800 }}>{initial.name ? "Edit subscription" : "Add a subscription"}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Keep recurring services, billing dates, and the account you use to pay them in one place.</Typography>
          <Stack spacing={2}>
            <TextField label="Service name" placeholder="e.g. Netflix, Spotify, iCloud+" value={form.name} onChange={e => setForm(v => ({ ...v, name: e.target.value }))} fullWidth required inputProps={{ maxLength: 100 }} />
            <TextField select label="Linked account" value={form.account_id} onChange={e => setForm(v => ({ ...v, account_id: e.target.value }))} fullWidth>
              {accounts.map(a => <MenuItem key={a.id} value={a.id}>{a.name} · {a.currency}{a.is_archived ? " (Archived)" : ""}</MenuItem>)}
            </TextField>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField label="Billing amount" type="number" value={form.amount} onChange={e => setForm(v => ({ ...v, amount: e.target.value }))} fullWidth required inputProps={{ min: "0.01", step: "0.01" }} InputProps={{ startAdornment: <Typography color="text.secondary" sx={{ mr: 1 }}>{accounts.find(a => a.id === form.account_id)?.currency ?? "¤"}</Typography> }} />
              <TextField select label="Billing frequency" value={form.billing_frequency} onChange={e => setForm(v => ({ ...v, billing_frequency: e.target.value as Frequency }))} fullWidth>
                <MenuItem value="weekly">Weekly</MenuItem><MenuItem value="monthly">Monthly</MenuItem><MenuItem value="quarterly">Quarterly</MenuItem><MenuItem value="yearly">Yearly</MenuItem>
              </TextField>
            </Stack>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField label="Next billing date" type="date" value={form.next_billing_date} onChange={e => setForm(v => ({ ...v, next_billing_date: e.target.value }))} fullWidth required InputLabelProps={{ shrink: true }} />
              <TextField select label="Category" value={form.category} onChange={e => setForm(v => ({ ...v, category: e.target.value }))} fullWidth>
                {categories.map(category => <MenuItem key={category} value={category}>{category}</MenuItem>)}
              </TextField>
            </Stack>
            <TextField label="Notes (optional)" value={form.notes} onChange={e => setForm(v => ({ ...v, notes: e.target.value }))} fullWidth multiline minRows={2} inputProps={{ maxLength: 500 }} />
            <TextField select label="Status" value={form.is_active ? "active" : "inactive"} onChange={e => setForm(v => ({ ...v, is_active: e.target.value === "active" }))} fullWidth>
              <MenuItem value="active">Active</MenuItem><MenuItem value="inactive">Inactive</MenuItem>
            </TextField>
            {formError && <Alert severity="error">{formError}</Alert>}
            <Alert severity="info">Recording a payment updates the billing date and payment history only. It will not create a transaction or change the linked account balance.</Alert>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button color="inherit" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={saving}>{saving ? <CircularProgress size={18} color="inherit" /> : "Save subscription"}</Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}

export function SubscriptionsManager() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Subscription | null>(null);
  const [form, setForm] = useState<SubscriptionForm>(emptyForm());
  const [menu, setMenu] = useState<{ element: HTMLElement; subscription: Subscription } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Subscription | null>(null);
  const [paymentTarget, setPaymentTarget] = useState<Subscription | null>(null);
  const [historyTarget, setHistoryTarget] = useState<Subscription | null>(null);
  const [paymentDate, setPaymentDate] = useState(todayLocal());
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [search, setSearch] = useState("");
  const [accountFilter, setAccountFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const data = await apiRequest<{ accounts: Account[]; subscriptions: Subscription[]; payments: Payment[] }>("/subscriptions");
      setAccounts(data.accounts ?? []);
      setSubscriptions(data.subscriptions ?? []);
      setPayments(data.payments ?? []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load subscriptions.");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { void loadData(); }, [loadData]);

  const accountById = useMemo(() => new Map(accounts.map(a => [a.id, a])), [accounts]);
  function openCreate() {
    setEditing(null);
    setForm({ ...emptyForm(), account_id: accounts.find(a => !a.is_archived)?.id ?? "" });
    setDialogOpen(true);
  }
  function openEdit(subscription: Subscription) {
    setEditing(subscription);
    setForm({
      account_id: subscription.account_id, name: subscription.name,
      amount: String(subscription.amount), billing_frequency: subscription.billing_frequency,
      next_billing_date: subscription.next_billing_date, category: subscription.category ?? "Other",
      notes: subscription.notes ?? "", is_active: subscription.is_active,
    });
    setMenu(null); setDialogOpen(true);
  }
  async function saveSubscription(value: SubscriptionForm) {
    const account = accounts.find(a => a.id === value.account_id);
    if (!account || (account.is_archived && (!editing || editing.account_id !== account.id))) {
      setError("Choose an active account."); return;
    }
    setSaving(true); setError(""); setNotice("");
    const payload = {
      account_id: value.account_id, name: value.name,
      amount: Number(value.amount), billing_frequency: value.billing_frequency,
      next_billing_date: value.next_billing_date, category: value.category || null,
      notes: value.notes.trim() || null, is_active: value.is_active,
    };
    try {
      if (editing) {
        await apiRequest(`/subscriptions/${editing.id}`, { method: "PUT", body: JSON.stringify(payload) });
      } else {
        await apiRequest("/subscriptions", { method: "POST", body: JSON.stringify(payload) });
      }
      setDialogOpen(false);
      setNotice(editing ? "Subscription updated." : "Subscription added.");
      await loadData();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to save subscription.");
    } finally {
      setSaving(false);
    }
  }
  async function deleteSubscription() {
    if (!deleteTarget) return;
    setSaving(true); setError("");
    try {
      await apiRequest(`/subscriptions/${deleteTarget.id}`, { method: "DELETE" });
      setDeleteTarget(null);
      setNotice("Subscription and its payment history deleted.");
      await loadData();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to delete subscription.");
    } finally {
      setSaving(false);
    }
  }
  async function setActive(subscription: Subscription, is_active: boolean) {
    setMenu(null); setError("");
    try {
      await apiRequest(`/subscriptions/${subscription.id}/status`, {
        method: "PATCH", body: JSON.stringify({ is_active }),
      });
      setNotice(is_active ? "Subscription resumed." : "Subscription paused.");
      await loadData();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to update subscription status.");
    }
  }
  function openPayment(subscription: Subscription) {
    setPaymentTarget(subscription); setPaymentDate(todayLocal());
    setPaymentAmount(String(subscription.amount)); setPaymentNotes("");
    setMenu(null);
  }
  async function recordPayment() {
    if (!paymentTarget) return;
    const amount = Number(paymentAmount);
    if (!Number.isFinite(amount) || amount <= 0 || !paymentDate) {
      setError("Enter a valid payment amount and date."); return;
    }
    setSaving(true); setError("");
    try {
      await apiRequest(`/subscriptions/${paymentTarget.id}/payments`, {
        method: "POST",
        body: JSON.stringify({ amount, paid_date: paymentDate, notes: paymentNotes.trim() || null }),
      });
      setPaymentTarget(null);
      setNotice("Payment recorded. Next billing date updated.");
      await loadData();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to record subscription payment.");
      await loadData();
    } finally {
      setSaving(false);
    }
  }
  async function deletePayment(payment: Payment) {
    if (!historyTarget) return;
    setSaving(true); setError("");
    try {
      const result = await apiRequest<{ message: string }>(
        `/subscriptions/${historyTarget.id}/payments/${payment.id}`,
        { method: "DELETE" },
      );
      setNotice(result.message);
      await loadData();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to delete payment history.");
    } finally {
      setSaving(false);
    }
  }

  const filtered = subscriptions.filter(subscription =>
    (accountFilter === "all" || subscription.account_id === accountFilter) &&
    (statusFilter === "all" || (statusFilter === "active" ? subscription.is_active : !subscription.is_active)) &&
    (!search || [subscription.name, subscription.category, accountById.get(subscription.account_id)?.name].join(" ").toLowerCase().includes(search.toLowerCase()))
  );
  const active = subscriptions.filter(s => s.is_active);
  const dueSoon = active.filter(s => { const days = daysUntil(s.next_billing_date); return days >= 0 && days <= 7; });
  const overdue = active.filter(s => daysUntil(s.next_billing_date) < 0);
  const monthlyByCurrency = new Map<string, number>();
  active.forEach(s => {
    const currency = accountById.get(s.account_id)?.currency ?? "PHP";
    const monthly = s.amount * (s.billing_frequency === "weekly" ? 52 / 12 : s.billing_frequency === "monthly" ? 1 : s.billing_frequency === "quarterly" ? 1 / 3 : 1 / 12);
    monthlyByCurrency.set(currency, (monthlyByCurrency.get(currency) ?? 0) + monthly);
  });
  const monthlyEstimate = Array.from(monthlyByCurrency, ([currency, amount]) => money(amount, currency)).join(" · ") || "—";
  const history = historyTarget ? payments.filter(p => p.subscription_id === historyTarget.id) : [];

  return (
    <Stack spacing={3}>
      <Stack direction={{ xs: "column", sm: "row" }} alignItems={{ xs: "stretch", sm: "center" }} justifyContent="space-between" spacing={2}>
        <Box><Typography variant="h4" fontWeight={800} letterSpacing={-0.8}>Subscriptions</Typography><Typography color="text.secondary" sx={{ mt: 0.7 }}>Stay ahead of recurring charges and keep track of what you pay.</Typography></Box>
        <Button variant="contained" startIcon={<AddRounded />} onClick={openCreate} disabled={!accounts.some(a => !a.is_archived)}>Add subscription</Button>
      </Stack>
      {error && <Alert severity="error" onClose={() => setError("")}>{error}</Alert>}
      <SuccessToast message={notice} onClose={() => setNotice("")} />
      {!accounts.some(a => !a.is_archived) && !loading && <Alert severity="info" action={<Button color="inherit" size="small" onClick={() => window.location.assign("/accounts")}>Go to accounts</Button>}>Add an active account before creating a subscription.</Alert>}
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(3,minmax(0,1fr))" }, gap: 2 }}>
        <Paper variant="outlined" sx={{ p: 2.3, borderRadius: 3 }}><Stack direction="row" alignItems="center" spacing={1.3}><Avatar sx={{ bgcolor: "action.hover", color: "primary.main" }}><SubscriptionsRounded /></Avatar><Box><Typography variant="caption" color="text.secondary">Active subscriptions</Typography><Typography variant="h6" fontWeight={800}>{active.length}</Typography></Box></Stack></Paper>
        <Paper variant="outlined" sx={{ p: 2.3, borderRadius: 3 }}><Stack direction="row" alignItems="center" spacing={1.3}><Avatar sx={{ bgcolor: "action.hover", color: "info.main" }}><CalendarMonthRounded /></Avatar><Box><Typography variant="caption" color="text.secondary">Estimated monthly cost</Typography><Typography variant="h6" fontWeight={800} sx={{ fontSize: { xs: 17, sm: 20 } }}>{monthlyEstimate}</Typography></Box></Stack></Paper>
        <Paper variant="outlined" sx={{ p: 2.3, borderRadius: 3 }}><Stack direction="row" alignItems="center" spacing={1.3}><Avatar sx={{ bgcolor: "action.hover", color: overdue.length ? "error.main" : "success.main" }}><AutorenewRounded /></Avatar><Box><Typography variant="caption" color="text.secondary">Due in 7 days · Overdue</Typography><Typography variant="h6" fontWeight={800}>{dueSoon.length} · {overdue.length}</Typography></Box></Stack></Paper>
      </Box>
      <Stack direction={{ xs: "column", md: "row" }} alignItems={{ xs: "stretch", md: "center" }} justifyContent="space-between" spacing={1.5}>
        <Box><Typography variant="h6" fontWeight={800}>Your subscriptions</Typography><Typography variant="body2" color="text.secondary">{filtered.length} {filtered.length === 1 ? "subscription" : "subscriptions"}</Typography></Box>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
          <TextField size="small" placeholder="Search subscriptions" value={search} onChange={e => setSearch(e.target.value)} InputProps={{ startAdornment: <SearchRounded fontSize="small" sx={{ mr: 1, color: "text.secondary" }} /> }} />
          <TextField select size="small" label="Account" value={accountFilter} onChange={e => setAccountFilter(e.target.value)} sx={{ minWidth: 145 }}><MenuItem value="all">All accounts</MenuItem>{accounts.map(a => <MenuItem key={a.id} value={a.id}>{a.name}</MenuItem>)}</TextField>
          <TextField select size="small" label="Status" value={statusFilter} onChange={e => setStatusFilter(e.target.value)} sx={{ minWidth: 135 }}><MenuItem value="all">All statuses</MenuItem><MenuItem value="active">Active</MenuItem><MenuItem value="inactive">Inactive</MenuItem></TextField>
          <Tooltip title="Refresh"><IconButton onClick={() => void loadData()} disabled={loading}><RefreshRounded /></IconButton></Tooltip>
        </Stack>
      </Stack>
      {loading ? <Paper sx={{ minHeight: 220, display: "grid", placeItems: "center", borderRadius: 3 }}><CircularProgress size={28} /></Paper> : filtered.length === 0 ? (
        <Paper variant="outlined" sx={{ p: { xs: 3, md: 5 }, minHeight: 250, display: "grid", placeItems: "center", textAlign: "center", borderRadius: 3 }}>
          <Stack alignItems="center" spacing={1.2} sx={{ maxWidth: 420 }}><Avatar variant="rounded" sx={{ width: 58, height: 58, bgcolor: "action.hover", color: "text.secondary" }}><SubscriptionsRounded fontSize="large" /></Avatar><Typography fontWeight={750} fontSize={18}>{subscriptions.length ? "No matching subscriptions" : "Keep your recurring bills in view"}</Typography><Typography color="text.secondary" variant="body2">{subscriptions.length ? "Try adjusting your search or filters." : "Add services like streaming, music, cloud storage, or memberships to see upcoming billing dates and estimated monthly costs."}</Typography>{subscriptions.length === 0 && accounts.some(a => !a.is_archived) && <Button variant="contained" startIcon={<AddRounded />} onClick={openCreate} sx={{ mt: 1 }}>Add your first subscription</Button>}</Stack>
        </Paper>
      ) : (
        <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 3 }}>
          <Table size="medium">
            <TableHead><TableRow><TableCell>Service</TableCell><TableCell>Account</TableCell><TableCell>Amount</TableCell><TableCell>Next billing</TableCell><TableCell>Status</TableCell><TableCell align="right"> </TableCell></TableRow></TableHead>
            <TableBody>
              {filtered.map(subscription => {
                const account = accountById.get(subscription.account_id);
                const days = daysUntil(subscription.next_billing_date);
                return <TableRow key={subscription.id} hover>
                  <TableCell><Stack spacing={0.35}><Typography fontWeight={750}>{subscription.name}</Typography><Typography variant="caption" color="text.secondary">{subscription.category || "Uncategorized"} · {subscription.billing_frequency}</Typography></Stack></TableCell>
                  <TableCell>{account?.name ?? "Unknown account"}</TableCell>
                  <TableCell sx={{ whiteSpace: "nowrap" }}>{money(Number(subscription.amount), account?.currency ?? "PHP")}</TableCell>
                  <TableCell sx={{ whiteSpace: "nowrap" }}><Stack spacing={0.35}><Typography variant="body2">{dateLabel(subscription.next_billing_date)}</Typography>{subscription.is_active && <Typography variant="caption" color={days < 0 ? "error.main" : days <= 7 ? "warning.main" : "text.secondary"}>{days < 0 ? `${Math.abs(days)} days overdue` : days === 0 ? "Due today" : days <= 7 ? `In ${days} days` : ""}</Typography>}</Stack></TableCell>
                  <TableCell><Chip size="small" variant="outlined" color={!subscription.is_active ? "default" : days < 0 ? "error" : "success"} label={!subscription.is_active ? "Inactive" : days < 0 ? "Overdue" : "Active"} /></TableCell>
                  <TableCell align="right"><IconButton size="small" aria-label={`Actions for ${subscription.name}`} onClick={e => setMenu({ element: e.currentTarget, subscription })}><MoreHorizRounded /></IconButton></TableCell>
                </TableRow>;
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}
      <Menu anchorEl={menu?.element} open={Boolean(menu)} onClose={() => setMenu(null)}>
        <MenuItem onClick={() => menu && openEdit(menu.subscription)}><EditOutlined fontSize="small" sx={{ mr: 1 }} />Edit subscription</MenuItem>
        {menu?.subscription.is_active && <MenuItem onClick={() => menu && openPayment(menu.subscription)}><CalendarMonthRounded fontSize="small" sx={{ mr: 1 }} />Record payment</MenuItem>}
        <MenuItem onClick={() => { if (menu) { setHistoryTarget(menu.subscription); setMenu(null); } }}><HistoryRounded fontSize="small" sx={{ mr: 1 }} />Payment history</MenuItem>
        <MenuItem onClick={() => menu && void setActive(menu.subscription, !menu.subscription.is_active)}><AutorenewRounded fontSize="small" sx={{ mr: 1 }} />{menu?.subscription.is_active ? "Pause subscription" : "Resume subscription"}</MenuItem>
        <Divider />
        <MenuItem sx={{ color: "error.main" }} onClick={() => { if (menu) { setDeleteTarget(menu.subscription); setMenu(null); } }}><DeleteOutlineRounded fontSize="small" sx={{ mr: 1 }} />Delete</MenuItem>
      </Menu>
      <SubscriptionDialog open={dialogOpen} accounts={accounts} initial={form} saving={saving} onClose={() => setDialogOpen(false)} onSave={saveSubscription} />
      <Dialog open={Boolean(paymentTarget)} onClose={saving ? undefined : () => setPaymentTarget(null)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 800 }}>Record subscription payment</DialogTitle>
        <DialogContent><Stack spacing={2} sx={{ pt: 1 }}>
          <Typography variant="body2" color="text.secondary">{paymentTarget?.name} · Billing date {paymentTarget ? dateLabel(paymentTarget.next_billing_date) : ""}</Typography>
          <TextField label="Amount paid" type="number" value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)} fullWidth inputProps={{ min: "0.01", step: "0.01" }} />
          <TextField label="Payment date" type="date" value={paymentDate} onChange={e => setPaymentDate(e.target.value)} fullWidth InputLabelProps={{ shrink: true }} />
          <TextField label="Notes (optional)" value={paymentNotes} onChange={e => setPaymentNotes(e.target.value)} fullWidth multiline minRows={2} />
          <Alert severity="info">This records the payment against the current billing cycle and moves the next billing date forward by one cycle.</Alert>
        </Stack></DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}><Button color="inherit" onClick={() => setPaymentTarget(null)} disabled={saving}>Cancel</Button><Button variant="contained" onClick={() => void recordPayment()} disabled={saving}>{saving ? <CircularProgress size={18} color="inherit" /> : "Record payment"}</Button></DialogActions>
      </Dialog>
      <Dialog open={Boolean(historyTarget)} onClose={() => setHistoryTarget(null)} fullWidth maxWidth="md">
        <DialogTitle sx={{ fontWeight: 800 }}>Payment history · {historyTarget?.name}</DialogTitle>
        <DialogContent>
          {history.length === 0 ? <Alert severity="info">No payments have been recorded for this subscription yet.</Alert> : <TableContainer><Table size="small"><TableHead><TableRow><TableCell>Billing date</TableCell><TableCell>Paid date</TableCell><TableCell>Amount</TableCell><TableCell>Notes</TableCell><TableCell align="right"> </TableCell></TableRow></TableHead><TableBody>{history.map(payment => <TableRow key={payment.id}><TableCell>{dateLabel(payment.billing_date)}</TableCell><TableCell>{dateLabel(payment.paid_date)}</TableCell><TableCell>{money(Number(payment.amount), accountById.get(historyTarget?.account_id ?? "")?.currency ?? "PHP")}</TableCell><TableCell>{payment.notes || "—"}</TableCell><TableCell align="right"><Tooltip title="Delete history entry"><IconButton size="small" color="error" onClick={() => void deletePayment(payment)} disabled={saving}><DeleteOutlineRounded fontSize="small" /></IconButton></Tooltip></TableCell></TableRow>)}</TableBody></Table></TableContainer>}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}><Button onClick={() => setHistoryTarget(null)}>Close</Button></DialogActions>
      </Dialog>
      <Dialog open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 800 }}>Delete subscription?</DialogTitle>
        <DialogContent><Typography color="text.secondary">Delete {deleteTarget?.name} and its payment history? This cannot be undone.</Typography></DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}><Button color="inherit" onClick={() => setDeleteTarget(null)} disabled={saving}>Cancel</Button><Button color="error" variant="contained" onClick={() => void deleteSubscription()} disabled={saving}>{saving ? <CircularProgress size={18} color="inherit" /> : "Delete"}</Button></DialogActions>
      </Dialog>
    </Stack>
  );
}
