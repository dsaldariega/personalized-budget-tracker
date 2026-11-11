"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AddRounded, DeleteOutlineRounded, EditOutlined, MoreHorizRounded,
  PaymentsRounded, RefreshRounded, SearchRounded, TrendingDownRounded,
} from "@mui/icons-material";
import {
  Alert, Avatar, Box, Button, Chip, CircularProgress, Dialog, DialogActions,
  DialogContent, DialogTitle, Divider, IconButton, LinearProgress, Menu,
  MenuItem, Paper, Stack, Table, TableBody, TableCell, TableHead, TableRow,
  TextField, Tooltip, Typography,
} from "@mui/material";
import { createClient } from "@/lib/supabase/client";

type Status = "active" | "paid" | "paused";
type Account = { id: string; name: string; currency: string; is_archived: boolean };
type Loan = {
  id: string; user_id: string; account_id: string; name: string;
  principal_amount: number; annual_interest_rate: number; term_months: number;
  start_date: string; due_date: string | null; notes: string | null;
  status: Status; created_at: string;
};
type Payment = {
  id: string; user_id: string; loan_id: string; amount: number;
  principal_paid: number; interest_paid: number; payment_date: string;
  notes: string | null; created_at: string;
};
type LoanForm = {
  account_id: string; name: string; principal_amount: string;
  annual_interest_rate: string; term_months: string;
  start_date: string; due_date: string; notes: string; status: Status;
};
type PaymentForm = { amount: string; principal_paid: string; interest_paid: string; payment_date: string; notes: string };
const today = () => {
  const d = new Date();
  return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, "0"), String(d.getDate()).padStart(2, "0")].join("-");
};
const emptyLoan = (): LoanForm => ({ account_id: "", name: "", principal_amount: "", annual_interest_rate: "0", term_months: "12", start_date: today(), due_date: "", notes: "", status: "active" });
const emptyPayment = (): PaymentForm => ({ amount: "", principal_paid: "", interest_paid: "0", payment_date: today(), notes: "" });
function money(amount: number, currency: string) {
  try { return new Intl.NumberFormat("en-PH", { style: "currency", currency, maximumFractionDigits: 2 }).format(amount); }
  catch { return currency + " " + amount.toLocaleString("en-PH", { maximumFractionDigits: 2 }); }
}
function dateLabel(value: string) {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" });
}
function monthlyEstimate(principal: number, annualRate: number, months: number) {
  if (!months) return 0;
  const rate = annualRate / 1200;
  return rate === 0 ? principal / months : principal * rate / (1 - Math.pow(1 + rate, -months));
}

function LoanDialog({ open, accounts, initial, saving, onClose, onSave }: {
  open: boolean; accounts: Account[]; initial: LoanForm; saving: boolean;
  onClose: () => void; onSave: (value: LoanForm) => void;
}) {
  const [form, setForm] = useState(initial);
  const [formError, setFormError] = useState("");
  useEffect(() => { if (open) { setForm(initial); setFormError(""); } }, [initial, open]);
  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const principal = Number(form.principal_amount), rate = Number(form.annual_interest_rate), months = Number(form.term_months);
    if (!form.account_id) return setFormError("Choose an account for this loan.");
    if (!form.name.trim()) return setFormError("Enter a loan name.");
    if (!Number.isFinite(principal) || principal <= 0) return setFormError("Enter a principal amount greater than zero.");
    if (!Number.isFinite(rate) || rate < 0 || rate > 100) return setFormError("Enter an annual interest rate between 0 and 100.");
    if (!Number.isInteger(months) || months < 1 || months > 600) return setFormError("Enter a loan term between 1 and 600 months.");
    if (!form.start_date) return setFormError("Choose a start date.");
    if (form.due_date && form.due_date < form.start_date) return setFormError("The due date cannot be before the start date.");
    onSave({ ...form, name: form.name.trim(), principal_amount: String(principal), annual_interest_rate: String(rate), term_months: String(months) });
  }
  const currency = accounts.find(a => a.id === form.account_id)?.currency ?? "PHP";
  const estimate = monthlyEstimate(Number(form.principal_amount) || 0, Number(form.annual_interest_rate) || 0, Number(form.term_months) || 0);
  return <Dialog open={open} onClose={saving ? undefined : onClose} fullWidth maxWidth="sm">
    <Box component="form" onSubmit={submit}>
      <DialogTitle sx={{ fontWeight: 800 }}>{initial.name ? "Edit loan" : "Add a loan"}</DialogTitle>
      <DialogContent><Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Record the original loan details. Repayments are recorded separately.</Typography>
        <Stack spacing={2}>
          <TextField label="Loan name" placeholder="e.g. Personal loan, Car loan" value={form.name} onChange={e => setForm(v => ({ ...v, name: e.target.value }))} fullWidth required inputProps={{ maxLength: 100 }} />
          <TextField select label="Linked account" value={form.account_id} onChange={e => setForm(v => ({ ...v, account_id: e.target.value }))} fullWidth>{accounts.map(a => <MenuItem key={a.id} value={a.id}>{a.name} · {a.currency}</MenuItem>)}</TextField>
          <TextField label="Principal amount" type="number" value={form.principal_amount} onChange={e => setForm(v => ({ ...v, principal_amount: e.target.value }))} fullWidth required inputProps={{ min: "0.01", step: "0.01" }} InputProps={{ startAdornment: <Typography color="text.secondary" sx={{ mr: 1 }}>{currency}</Typography> }} />
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <TextField label="Annual interest rate (%)" type="number" value={form.annual_interest_rate} onChange={e => setForm(v => ({ ...v, annual_interest_rate: e.target.value }))} fullWidth required inputProps={{ min: "0", max: "100", step: "0.01" }} />
            <TextField label="Term (months)" type="number" value={form.term_months} onChange={e => setForm(v => ({ ...v, term_months: e.target.value }))} fullWidth required inputProps={{ min: "1", max: "600", step: "1" }} />
          </Stack>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <TextField label="Start date" type="date" value={form.start_date} onChange={e => setForm(v => ({ ...v, start_date: e.target.value }))} fullWidth InputLabelProps={{ shrink: true }} />
            <TextField label="Final due date (optional)" type="date" value={form.due_date} onChange={e => setForm(v => ({ ...v, due_date: e.target.value }))} fullWidth InputLabelProps={{ shrink: true }} />
          </Stack>
          <TextField label="Notes (optional)" value={form.notes} onChange={e => setForm(v => ({ ...v, notes: e.target.value }))} fullWidth multiline minRows={2} inputProps={{ maxLength: 500 }} />
          <Paper variant="outlined" sx={{ p: 1.7, borderRadius: 2 }}><Typography variant="caption" color="text.secondary">Estimated monthly installment</Typography><Typography variant="h6" fontWeight={800}>{money(estimate, currency)}</Typography><Typography variant="caption" color="text.secondary">Estimate uses a fixed monthly rate and equal monthly installments. Actual lender terms may differ.</Typography></Paper>
          {formError && <Alert severity="error">{formError}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}><Button color="inherit" onClick={onClose} disabled={saving}>Cancel</Button><Button type="submit" variant="contained" disabled={saving}>{saving ? <CircularProgress size={18} color="inherit" /> : "Save loan"}</Button></DialogActions>
    </Box>
  </Dialog>;
}

function PaymentDialog({ open, loan, currency, remainingPrincipal, saving, onClose, onSave }: {
  open: boolean; loan: Loan | null; currency: string; remainingPrincipal: number;
  saving: boolean; onClose: () => void; onSave: (value: PaymentForm) => void;
}) {
  const [form, setForm] = useState<PaymentForm>(emptyPayment());
  const [formError, setFormError] = useState("");
  useEffect(() => { if (open) { setForm(emptyPayment()); setFormError(""); } }, [open, loan?.id]);
  const amount = Number(form.amount) || 0, principal = Number(form.principal_paid) || 0, interest = Number(form.interest_paid) || 0;
  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.payment_date) return setFormError("Choose the payment date.");
    if (!Number.isFinite(amount) || amount <= 0) return setFormError("Enter a payment amount greater than zero.");
    if (!Number.isFinite(principal) || principal < 0 || !Number.isFinite(interest) || interest < 0) return setFormError("Enter valid principal and interest amounts.");
    if (Math.abs(amount - principal - interest) > 0.009) return setFormError("Payment amount must equal principal paid plus interest paid.");
    if (principal > remainingPrincipal + 0.009) return setFormError("Principal paid cannot exceed the remaining principal.");
    if (principal === 0 && interest === 0) return setFormError("Enter a principal or interest amount.");
    onSave(form);
  }
  return <Dialog open={open} onClose={saving ? undefined : onClose} fullWidth maxWidth="sm">
    <Box component="form" onSubmit={submit}>
      <DialogTitle sx={{ fontWeight: 800 }}>Record a loan payment</DialogTitle>
      <DialogContent><Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{loan?.name} · Remaining principal {money(remainingPrincipal, currency)}</Typography>
        <Stack spacing={2}>
          <TextField label="Total payment" type="number" value={form.amount} onChange={e => setForm(v => ({ ...v, amount: e.target.value }))} fullWidth required inputProps={{ min: "0.01", step: "0.01" }} InputProps={{ startAdornment: <Typography color="text.secondary" sx={{ mr: 1 }}>{currency}</Typography> }} />
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <TextField label="Principal paid" type="number" value={form.principal_paid} onChange={e => setForm(v => ({ ...v, principal_paid: e.target.value }))} fullWidth required inputProps={{ min: "0", step: "0.01" }} />
            <TextField label="Interest paid" type="number" value={form.interest_paid} onChange={e => setForm(v => ({ ...v, interest_paid: e.target.value }))} fullWidth required inputProps={{ min: "0", step: "0.01" }} />
          </Stack>
          <Alert severity="info">Enter how the lender allocated this payment. Principal reduces the outstanding balance; interest is tracked separately.</Alert>
          <TextField label="Payment date" type="date" value={form.payment_date} onChange={e => setForm(v => ({ ...v, payment_date: e.target.value }))} fullWidth InputLabelProps={{ shrink: true }} />
          <TextField label="Notes (optional)" value={form.notes} onChange={e => setForm(v => ({ ...v, notes: e.target.value }))} fullWidth inputProps={{ maxLength: 300 }} />
          {formError && <Alert severity="error">{formError}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}><Button color="inherit" onClick={onClose} disabled={saving}>Cancel</Button><Button type="submit" variant="contained" disabled={saving}>{saving ? <CircularProgress size={18} color="inherit" /> : "Record payment"}</Button></DialogActions>
    </Box>
  </Dialog>;
}

export function LoansManager() {
  const supabase = useMemo(() => createClient(), []);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loanDialog, setLoanDialog] = useState(false);
  const [paymentDialog, setPaymentDialog] = useState(false);
  const [editing, setEditing] = useState<Loan | null>(null);
  const [paymentLoan, setPaymentLoan] = useState<Loan | null>(null);
  const [loanForm, setLoanForm] = useState<LoanForm>(emptyLoan());
  const [menu, setMenu] = useState<{ element: HTMLElement; loan: Loan } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Loan | null>(null);
  const [paymentDeleteTarget, setPaymentDeleteTarget] = useState<Payment | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [accountFilter, setAccountFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadData = useCallback(async () => {
    if (!supabase) { setError("Supabase is not configured. Check your frontend environment variables."); setLoading(false); return; }
    setLoading(true); setError("");
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) { setError("Your session could not be verified. Please sign in again."); setLoading(false); return; }
    const [a, l, p] = await Promise.all([
      supabase.from("accounts").select("id,name,currency,is_archived").eq("user_id", user.id).order("name"),
      supabase.from("loans").select("id,user_id,account_id,name,principal_amount,annual_interest_rate,term_months,start_date,due_date,notes,status,created_at").eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("loan_payments").select("id,user_id,loan_id,amount,principal_paid,interest_paid,payment_date,notes,created_at").eq("user_id", user.id).order("payment_date", { ascending: false }),
    ]);
    if (a.error) setError(a.error.message); else setAccounts((a.data ?? []) as Account[]);
    if (l.error) setError(l.error.message); else setLoans((l.data ?? []) as Loan[]);
    if (p.error) setError(p.error.message); else setPayments((p.data ?? []) as Payment[]);
    setLoading(false);
  }, [supabase]);
  useEffect(() => { void loadData(); }, [loadData]);

  function openCreate() { setEditing(null); setLoanForm({ ...emptyLoan(), account_id: accounts.find(a => !a.is_archived)?.id ?? "" }); setLoanDialog(true); }
  function openEdit(loan: Loan) {
    setEditing(loan); setLoanForm({ account_id: loan.account_id, name: loan.name, principal_amount: String(loan.principal_amount), annual_interest_rate: String(loan.annual_interest_rate), term_months: String(loan.term_months), start_date: loan.start_date, due_date: loan.due_date ?? "", notes: loan.notes ?? "", status: loan.status }); setMenu(null); setLoanDialog(true);
  }
  async function saveLoan(value: LoanForm) {
    if (!supabase) return;
    setSaving(true); setError(""); setNotice("");
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) { setError("Your session has expired. Please sign in again."); setSaving(false); return; }
    const account = accounts.find(a => a.id === value.account_id);
    if (!account || (account.is_archived && (!editing || editing.account_id !== account.id))) { setError("Choose an active account."); setSaving(false); return; }
    const payload = { user_id: user.id, account_id: value.account_id, name: value.name, principal_amount: Number(value.principal_amount), annual_interest_rate: Number(value.annual_interest_rate), term_months: Number(value.term_months), start_date: value.start_date, due_date: value.due_date || null, notes: value.notes.trim() || null, status: value.status };
    const result = editing ? await supabase.from("loans").update(payload).eq("id", editing.id).eq("user_id", user.id) : await supabase.from("loans").insert(payload);
    if (result.error) { setError(result.error.message); setSaving(false); return; }
    await supabase.from("activity_logs").insert({ user_id: user.id, action: editing ? "loan.updated" : "loan.created", entity_type: "loan", entity_id: editing?.id ?? null, details: { name: value.name, principal_amount: Number(value.principal_amount), status: value.status } });
    setLoanDialog(false); setNotice(editing ? "Loan updated." : "Loan created."); setSaving(false); await loadData();
  }
  async function recordPayment(value: PaymentForm) {
    if (!supabase || !paymentLoan) return;
    setSaving(true); setError("");
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) { setError("Your session has expired. Please sign in again."); setSaving(false); return; }
    const payload = { user_id: user.id, loan_id: paymentLoan.id, amount: Number(value.amount), principal_paid: Number(value.principal_paid), interest_paid: Number(value.interest_paid), payment_date: value.payment_date, notes: value.notes.trim() || null };
    const result = await supabase.from("loan_payments").insert(payload).select("id").single();
    if (result.error) { setError(result.error.message); setSaving(false); return; }
    const paidPrincipal = payments.filter(p => p.loan_id === paymentLoan.id).reduce((sum, p) => sum + Number(p.principal_paid), 0) + payload.principal_paid;
    const newStatus = paidPrincipal >= Number(paymentLoan.principal_amount) ? "paid" : paymentLoan.status === "paid" ? "active" : paymentLoan.status;
    if (newStatus !== paymentLoan.status) await supabase.from("loans").update({ status: newStatus }).eq("id", paymentLoan.id).eq("user_id", user.id);
    await supabase.from("activity_logs").insert({ user_id: user.id, action: "loan.payment_recorded", entity_type: "loan", entity_id: paymentLoan.id, details: { amount: payload.amount, principal_paid: payload.principal_paid, interest_paid: payload.interest_paid } });
    setPaymentDialog(false); setPaymentLoan(null); setNotice("Loan payment recorded."); setSaving(false); await loadData();
  }
  async function deleteLoan() {
    if (!supabase || !deleteTarget) return;
    setSaving(true); setError("");
    const result = await supabase.from("loans").delete().eq("id", deleteTarget.id).eq("user_id", deleteTarget.user_id);
    if (result.error) { setError(result.error.message); setSaving(false); setDeleteTarget(null); return; }
    await supabase.from("activity_logs").insert({ user_id: deleteTarget.user_id, action: "loan.deleted", entity_type: "loan", entity_id: deleteTarget.id, details: { name: deleteTarget.name } });
    setDeleteTarget(null); setNotice("Loan and its repayment history deleted."); setSaving(false); await loadData();
  }
  async function deletePayment() {
    if (!supabase || !paymentDeleteTarget) return;
    setSaving(true); setError("");
    const payment = paymentDeleteTarget;
    const result = await supabase.from("loan_payments").delete().eq("id", payment.id).eq("user_id", payment.user_id);
    if (result.error) { setError(result.error.message); setSaving(false); setPaymentDeleteTarget(null); return; }
    const loan = loans.find(l => l.id === payment.loan_id);
    if (loan) {
      const remainingPayments = payments.filter(p => p.loan_id === loan.id && p.id !== payment.id);
      const paidPrincipal = remainingPayments.reduce((sum, p) => sum + Number(p.principal_paid), 0);
      await supabase.from("loans").update({ status: paidPrincipal >= Number(loan.principal_amount) ? "paid" : loan.status === "paid" ? "active" : loan.status }).eq("id", loan.id).eq("user_id", payment.user_id);
    }
    await supabase.from("activity_logs").insert({ user_id: payment.user_id, action: "loan.payment_deleted", entity_type: "loan", entity_id: payment.loan_id, details: { amount: payment.amount } });
    setPaymentDeleteTarget(null); setNotice("Payment deleted."); setSaving(false); await loadData();
  }
  async function setStatus(loan: Loan, status: Status) {
    if (!supabase) return;
    setMenu(null); setError("");
    const result = await supabase.from("loans").update({ status }).eq("id", loan.id).eq("user_id", loan.user_id);
    if (result.error) { setError(result.error.message); return; }
    await supabase.from("activity_logs").insert({ user_id: loan.user_id, action: "loan.status_updated", entity_type: "loan", entity_id: loan.id, details: { name: loan.name, status } });
    setNotice(status === "paid" ? "Loan marked as paid." : status === "paused" ? "Loan paused." : "Loan resumed."); await loadData();
  }

  const accountById = useMemo(() => new Map(accounts.map(a => [a.id, a])), [accounts]);
  const rows = loans.map(loan => {
    const loanPayments = payments.filter(p => p.loan_id === loan.id);
    const principalPaid = loanPayments.reduce((sum, p) => sum + Number(p.principal_paid), 0);
    const interestPaid = loanPayments.reduce((sum, p) => sum + Number(p.interest_paid), 0);
    const paid = loanPayments.reduce((sum, p) => sum + Number(p.amount), 0);
    const remaining = Math.max(0, Number(loan.principal_amount) - principalPaid);
    return { loan, loanPayments, principalPaid, interestPaid, paid, remaining, account: accountById.get(loan.account_id), progress: Math.min(100, principalPaid / Number(loan.principal_amount) * 100) };
  });
  const filtered = rows.filter(r => (accountFilter === "all" || r.loan.account_id === accountFilter) && (statusFilter === "all" || r.loan.status === statusFilter) && (!search || [r.loan.name, r.account?.name].join(" ").toLowerCase().includes(search.toLowerCase())));
  const activeRows = rows.filter(r => r.loan.status === "active");
  const sumByCurrency = new Map<string, { remaining: number; interest: number }>();
  activeRows.forEach(r => { const c = r.account?.currency ?? "PHP"; const v = sumByCurrency.get(c) ?? { remaining: 0, interest: 0 }; v.remaining += r.remaining; v.interest += r.interestPaid; sumByCurrency.set(c, v); });
  const balanceLabel = Array.from(sumByCurrency, ([c, v]) => money(v.remaining, c)).join(" · ") || "—";
  const interestLabel = Array.from(sumByCurrency, ([c, v]) => money(v.interest, c)).join(" · ") || "—";

  return <Stack spacing={3}>
    <Stack direction={{ xs: "column", sm: "row" }} alignItems={{ xs: "stretch", sm: "center" }} justifyContent="space-between" spacing={2}>
      <Box><Typography variant="h4" fontWeight={800} letterSpacing={-0.8}>Loans</Typography><Typography color="text.secondary" sx={{ mt: 0.7 }}>Keep track of borrowed money, repayments, and what remains.</Typography></Box>
      <Button variant="contained" startIcon={<AddRounded />} onClick={openCreate} disabled={!accounts.some(a => !a.is_archived)}>Add loan</Button>
    </Stack>
    {error && <Alert severity="error" onClose={() => setError("")}>{error}</Alert>}
    {notice && <Alert severity="success" onClose={() => setNotice("")}>{notice}</Alert>}
    {!accounts.some(a => !a.is_archived) && !loading && <Alert severity="info" action={<Button color="inherit" size="small" onClick={() => window.location.assign("/accounts")}>Go to accounts</Button>}>Add an active account before creating a loan.</Alert>}
    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(3,minmax(0,1fr))" }, gap: 2 }}>
      <Paper variant="outlined" sx={{ p: 2.3, borderRadius: 3 }}><Stack direction="row" alignItems="center" spacing={1.3}><Avatar sx={{ bgcolor: "action.hover", color: "primary.main" }}><PaymentsRounded /></Avatar><Box><Typography variant="caption" color="text.secondary">Active loans</Typography><Typography variant="h6" fontWeight={800}>{activeRows.length}</Typography></Box></Stack></Paper>
      <Paper variant="outlined" sx={{ p: 2.3, borderRadius: 3 }}><Stack direction="row" alignItems="center" spacing={1.3}><Avatar sx={{ bgcolor: "action.hover", color: "warning.main" }}><TrendingDownRounded /></Avatar><Box><Typography variant="caption" color="text.secondary">Outstanding principal</Typography><Typography variant="h6" fontWeight={800} sx={{ fontSize: { xs: 18, sm: 20 } }}>{balanceLabel}</Typography></Box></Stack></Paper>
      <Paper variant="outlined" sx={{ p: 2.3, borderRadius: 3 }}><Stack direction="row" alignItems="center" spacing={1.3}><Avatar sx={{ bgcolor: "action.hover", color: "success.main" }}><PaymentsRounded /></Avatar><Box><Typography variant="caption" color="text.secondary">Interest paid (active loans)</Typography><Typography variant="h6" fontWeight={800} sx={{ fontSize: { xs: 18, sm: 20 } }}>{interestLabel}</Typography></Box></Stack></Paper>
    </Box>
    <Stack direction={{ xs: "column", md: "row" }} alignItems={{ xs: "stretch", md: "center" }} justifyContent="space-between" spacing={1.5}>
      <Box><Typography variant="h6" fontWeight={800}>Your loans</Typography><Typography variant="body2" color="text.secondary">{filtered.length} {filtered.length === 1 ? "loan" : "loans"}</Typography></Box>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
        <TextField size="small" placeholder="Search loans" value={search} onChange={e => setSearch(e.target.value)} InputProps={{ startAdornment: <SearchRounded fontSize="small" sx={{ mr: 1, color: "text.secondary" }} /> }} />
        <TextField select size="small" label="Account" value={accountFilter} onChange={e => setAccountFilter(e.target.value)} sx={{ minWidth: 140 }}><MenuItem value="all">All accounts</MenuItem>{accounts.map(a => <MenuItem key={a.id} value={a.id}>{a.name}</MenuItem>)}</TextField>
        <TextField select size="small" label="Status" value={statusFilter} onChange={e => setStatusFilter(e.target.value)} sx={{ minWidth: 130 }}><MenuItem value="all">All statuses</MenuItem><MenuItem value="active">Active</MenuItem><MenuItem value="paused">Paused</MenuItem><MenuItem value="paid">Paid</MenuItem></TextField>
        <Tooltip title="Refresh"><IconButton onClick={() => void loadData()} disabled={loading}><RefreshRounded /></IconButton></Tooltip>
      </Stack>
    </Stack>
    {loading ? <Paper sx={{ minHeight: 220, display: "grid", placeItems: "center", borderRadius: 3 }}><CircularProgress size={28} /></Paper> : filtered.length === 0 ? <Paper variant="outlined" sx={{ p: { xs: 3, md: 5 }, minHeight: 250, display: "grid", placeItems: "center", textAlign: "center", borderRadius: 3 }}><Stack alignItems="center" spacing={1.2} sx={{ maxWidth: 410 }}><Avatar variant="rounded" sx={{ width: 58, height: 58, bgcolor: "action.hover", color: "text.secondary" }}><PaymentsRounded fontSize="large" /></Avatar><Typography fontWeight={750} fontSize={18}>{loans.length ? "No matching loans" : "Keep your loan details together"}</Typography><Typography color="text.secondary" variant="body2">{loans.length ? "Try adjusting your search or filters." : "Add a loan, record repayments, and see your outstanding principal at a glance."}</Typography>{loans.length === 0 && accounts.some(a => !a.is_archived) && <Button variant="contained" startIcon={<AddRounded />} onClick={openCreate} sx={{ mt: 1 }}>Add your first loan</Button>}</Stack></Paper> : <Stack spacing={2}>
      {filtered.map(({ loan, loanPayments, principalPaid, interestPaid, paid, remaining, account, progress }) => {
        const currency = account?.currency ?? "PHP";
        const estimate = monthlyEstimate(Number(loan.principal_amount), Number(loan.annual_interest_rate), Number(loan.term_months));
        const expandedNow = expanded === loan.id;
        return <Paper key={loan.id} variant="outlined" sx={{ p: 2.4, borderRadius: 3 }}>
          <Stack direction="row" spacing={1.2} alignItems="flex-start">
            <Avatar variant="rounded" sx={{ bgcolor: "action.hover", color: "primary.main" }}><PaymentsRounded /></Avatar>
            <Box sx={{ flex: 1, minWidth: 0 }}><Typography fontWeight={800}>{loan.name}</Typography><Typography variant="body2" color="text.secondary">{account?.name ?? "Unknown account"} · {Number(loan.annual_interest_rate).toFixed(2)}% p.a. · {loan.term_months} months</Typography></Box>
            <Chip size="small" variant="outlined" color={loan.status === "paid" ? "success" : loan.status === "paused" ? "default" : "primary"} label={loan.status.charAt(0).toUpperCase() + loan.status.slice(1)} />
            <IconButton size="small" aria-label={`Actions for ${loan.name}`} onClick={e => setMenu({ element: e.currentTarget, loan })}><MoreHorizRounded /></IconButton>
          </Stack>
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "repeat(2,minmax(0,1fr))", sm: "repeat(4,minmax(0,1fr))" }, gap: 2, mt: 2.2 }}>
            <Box><Typography variant="caption" color="text.secondary">Original principal</Typography><Typography fontWeight={800}>{money(Number(loan.principal_amount), currency)}</Typography></Box>
            <Box><Typography variant="caption" color="text.secondary">Principal paid</Typography><Typography fontWeight={800}>{money(principalPaid, currency)}</Typography></Box>
            <Box><Typography variant="caption" color="text.secondary">Outstanding</Typography><Typography fontWeight={800} color={remaining > 0 ? "warning.main" : "success.main"}>{money(remaining, currency)}</Typography></Box>
            <Box><Typography variant="caption" color="text.secondary">Est. monthly</Typography><Typography fontWeight={800}>{money(estimate, currency)}</Typography></Box>
          </Box>
          <LinearProgress variant="determinate" value={progress} color={loan.status === "paid" ? "success" : "primary"} sx={{ height: 8, borderRadius: 99, mt: 2, bgcolor: "action.hover" }} />
          <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ xs: "stretch", sm: "center" }} spacing={1} sx={{ mt: 1 }}>
            <Typography variant="caption" color="text.secondary">{progress.toFixed(0)}% principal repaid · {loan.due_date ? `Due ${dateLabel(loan.due_date)}` : `Started ${dateLabel(loan.start_date)}`}</Typography>
            <Stack direction="row" spacing={1}>
              <Button size="small" onClick={() => setExpanded(expandedNow ? null : loan.id)}>{expandedNow ? "Hide history" : `Payment history (${loanPayments.length})`}</Button>
              <Button size="small" variant="contained" onClick={() => { setPaymentLoan(loan); setPaymentDialog(true); }} disabled={loan.status === "paid" || remaining <= 0}>Record payment</Button>
            </Stack>
          </Stack>
          {expandedNow && <Box sx={{ mt: 2 }}><Divider sx={{ mb: 1.5 }} /><Stack direction="row" justifyContent="space-between" sx={{ mb: 1 }}><Typography fontWeight={750}>Repayment history</Typography><Typography variant="caption" color="text.secondary">Total paid {money(paid, currency)} · Interest {money(interestPaid, currency)}</Typography></Stack>
            {loanPayments.length === 0 ? <Typography variant="body2" color="text.secondary">No payments recorded yet.</Typography> : <Box sx={{ overflowX: "auto" }}><Table size="small"><TableHead><TableRow><TableCell>Date</TableCell><TableCell align="right">Payment</TableCell><TableCell align="right">Principal</TableCell><TableCell align="right">Interest</TableCell><TableCell align="right"> </TableCell></TableRow></TableHead><TableBody>{loanPayments.map(p => <TableRow key={p.id}><TableCell>{dateLabel(p.payment_date)}</TableCell><TableCell align="right">{money(Number(p.amount), currency)}</TableCell><TableCell align="right">{money(Number(p.principal_paid), currency)}</TableCell><TableCell align="right">{money(Number(p.interest_paid), currency)}</TableCell><TableCell align="right"><IconButton size="small" aria-label="Delete payment" onClick={() => setPaymentDeleteTarget(p)}><DeleteOutlineRounded fontSize="small" /></IconButton></TableCell></TableRow>)}</TableBody></Table></Box>}
          </Box>}
          {loan.notes && <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1.5 }}>{loan.notes}</Typography>}
        </Paper>;
      })}
    </Stack>}
    <Menu anchorEl={menu?.element ?? null} open={Boolean(menu)} onClose={() => setMenu(null)}>
      <MenuItem onClick={() => menu && openEdit(menu.loan)}><EditOutlined fontSize="small" sx={{ mr: 1 }} /> Edit loan</MenuItem>
      {menu?.loan.status !== "active" && menu?.loan.status !== "paid" && <MenuItem onClick={() => menu && void setStatus(menu.loan, "active")}>Resume loan</MenuItem>}
      {menu?.loan.status === "active" && <MenuItem onClick={() => menu && void setStatus(menu.loan, "paused")}>Pause loan</MenuItem>}
      {menu?.loan.status !== "paid" && <MenuItem onClick={() => menu && void setStatus(menu.loan, "paid")}>Mark as paid</MenuItem>}
      {menu?.loan.status === "paid" && <MenuItem onClick={() => menu && void setStatus(menu.loan, "active")}>Reopen loan</MenuItem>}
      <Divider /><MenuItem sx={{ color: "error.main" }} onClick={() => { setDeleteTarget(menu?.loan ?? null); setMenu(null); }}><DeleteOutlineRounded fontSize="small" sx={{ mr: 1 }} /> Delete loan</MenuItem>
    </Menu>
    <LoanDialog open={loanDialog} accounts={accounts.filter(a => !a.is_archived || a.id === editing?.account_id)} initial={loanForm} saving={saving} onClose={() => setLoanDialog(false)} onSave={saveLoan} />
    <PaymentDialog open={paymentDialog} loan={paymentLoan} currency={accountById.get(paymentLoan?.account_id ?? "")?.currency ?? "PHP"} remainingPrincipal={paymentLoan ? Math.max(0, Number(paymentLoan.principal_amount) - payments.filter(p => p.loan_id === paymentLoan.id).reduce((s, p) => s + Number(p.principal_paid), 0)) : 0} saving={saving} onClose={() => { setPaymentDialog(false); setPaymentLoan(null); }} onSave={recordPayment} />
    <Dialog open={Boolean(deleteTarget)} onClose={() => !saving && setDeleteTarget(null)} maxWidth="xs" fullWidth><DialogTitle sx={{ fontWeight: 800 }}>Delete this loan?</DialogTitle><DialogContent><Typography variant="body2" color="text.secondary">This also deletes its repayment history. Your account transactions and balance will not be changed.</Typography></DialogContent><DialogActions sx={{ px: 3, pb: 2.5 }}><Button color="inherit" onClick={() => setDeleteTarget(null)} disabled={saving}>Cancel</Button><Button color="error" variant="contained" onClick={() => void deleteLoan()} disabled={saving}>{saving ? <CircularProgress size={18} color="inherit" /> : "Delete"}</Button></DialogActions></Dialog>
    <Dialog open={Boolean(paymentDeleteTarget)} onClose={() => !saving && setPaymentDeleteTarget(null)} maxWidth="xs" fullWidth><DialogTitle sx={{ fontWeight: 800 }}>Delete this payment?</DialogTitle><DialogContent><Typography variant="body2" color="text.secondary">The outstanding principal and loan status will be recalculated from the remaining payment records.</Typography></DialogContent><DialogActions sx={{ px: 3, pb: 2.5 }}><Button color="inherit" onClick={() => setPaymentDeleteTarget(null)} disabled={saving}>Cancel</Button><Button color="error" variant="contained" onClick={() => void deletePayment()} disabled={saving}>{saving ? <CircularProgress size={18} color="inherit" /> : "Delete payment"}</Button></DialogActions></Dialog>
  </Stack>;
}
