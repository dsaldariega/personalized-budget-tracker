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
import { apiRequest } from "@/lib/api";

type Status = "active" | "paid" | "paused";
type InterestType = "flat_rate" | "reducing_balance";
type Account = { id: string; name: string; currency: string; is_archived: boolean };
type Loan = {
  id: string; user_id: string; account_id: string; name: string;
  principal_amount: number; monthly_interest_rate: number; interest_type: InterestType; term_months: number;
  start_date: string; due_date: string | null; notes: string | null;
  status: Status; created_at: string;
};
type Payment = {
  id: string; user_id: string; loan_id: string; amount: number;
  principal_paid: number; interest_paid: number; payment_date: string;
  notes: string | null; allocation_method: "manual" | "automatic"; created_at: string;
};
type LoanForm = {
  account_id: string; name: string; principal_amount: string;
  monthly_interest_rate: string; interest_type: InterestType; term_months: string;
  start_date: string; due_date: string; notes: string; status: Status;
};
type PaymentForm = { amount: string; payment_date: string; notes: string };
const today = () => {
  const d = new Date();
  return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, "0"), String(d.getDate()).padStart(2, "0")].join("-");
};
const emptyLoan = (): LoanForm => ({ account_id: "", name: "", principal_amount: "", monthly_interest_rate: "0", interest_type: "reducing_balance", term_months: "12", start_date: today(), due_date: "", notes: "", status: "active" });
const emptyPayment = (): PaymentForm => ({ amount: "", payment_date: today(), notes: "" });
function money(amount: number, currency: string) {
  try { return new Intl.NumberFormat("en-PH", { style: "currency", currency, maximumFractionDigits: 2 }).format(amount); }
  catch { return currency + " " + amount.toLocaleString("en-PH", { maximumFractionDigits: 2 }); }
}
function calculateDueDate(startDate: string, months: number) {
  if (!startDate || !Number.isInteger(months) || months < 1) return "";
  const [year, month, day] = startDate.split("-").map(Number);
  const targetMonth = month - 1 + months;
  const targetYear = year + Math.floor(targetMonth / 12);
  const normalizedMonth = targetMonth % 12;
  const lastDay = new Date(Date.UTC(targetYear, normalizedMonth + 1, 0)).getUTCDate();
  return [targetYear, String(normalizedMonth + 1).padStart(2, "0"), String(Math.min(day, lastDay)).padStart(2, "0")].join("-");
}
function dateLabel(value: string) {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" });
}
function roundMoney(value: number) { return Math.round((value + Number.EPSILON) * 100) / 100; }
function monthsBetween(from: string, to: string) {
  const start = Date.parse(`${from}T00:00:00.000Z`);
  const end = Date.parse(`${to}T00:00:00.000Z`);
  return Number.isFinite(start) && Number.isFinite(end) ? Math.max(0, (end - start) / 86400000 / 30.4375) : 0;
}
function monthlyEstimate(principal: number, monthlyRatePercent: number, months: number, interestType: InterestType) {
  if (!months) return 0;
  const rate = monthlyRatePercent / 100;
  if (interestType === "flat_rate") return roundMoney((principal + principal * rate * months) / months);
  return rate === 0 ? principal / months : principal * rate / (1 - Math.pow(1 + rate, -months));
}
function paymentSnapshot(loan: Loan, loanPayments: Payment[]) {
  let remainingPrincipal = Number(loan.principal_amount);
  let accruedInterest = 0;
  let flatInterestAccrued = 0;
  let totalInterestPaid = 0;
  let accrualDate = loan.start_date;
  const originalPrincipal = Number(loan.principal_amount);
  const monthlyRate = Number(loan.monthly_interest_rate) / 100;
  const totalFlatInterest = roundMoney(originalPrincipal * monthlyRate * Number(loan.term_months));
  const ordered = [...loanPayments].sort((a, b) => a.payment_date.localeCompare(b.payment_date) || a.created_at.localeCompare(b.created_at));
  for (const payment of ordered) {
    const elapsed = monthsBetween(accrualDate, payment.payment_date);
    if (loan.interest_type === "flat_rate") {
      flatInterestAccrued = roundMoney(Math.min(totalFlatInterest, flatInterestAccrued + originalPrincipal * monthlyRate * elapsed));
      accruedInterest = roundMoney(Math.max(0, flatInterestAccrued - totalInterestPaid));
    } else {
      accruedInterest = roundMoney(accruedInterest + remainingPrincipal * monthlyRate * elapsed);
    }
    totalInterestPaid = roundMoney(totalInterestPaid + Number(payment.interest_paid));
    accruedInterest = roundMoney(Math.max(0, accruedInterest - Number(payment.interest_paid)));
    remainingPrincipal = roundMoney(Math.max(0, remainingPrincipal - Number(payment.principal_paid)));
    accrualDate = payment.payment_date;
  }
  return { remainingPrincipal, accruedInterest, flatInterestAccrued, totalInterestPaid, lastPaymentDate: accrualDate };
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
    const principal = Number(form.principal_amount), rate = Number(form.monthly_interest_rate), months = Number(form.term_months);
    if (!form.account_id) return setFormError("Choose an account for this loan.");
    if (!form.name.trim()) return setFormError("Enter a loan name.");
    if (!Number.isFinite(principal) || principal <= 0) return setFormError("Enter a principal amount greater than zero.");
    if (!Number.isFinite(rate) || rate < 0 || rate > 100) return setFormError("Enter a monthly interest rate between 0 and 100.");
    if (!Number.isInteger(months) || months < 1 || months > 600) return setFormError("Enter a loan term between 1 and 600 months.");
    if (!form.start_date) return setFormError("Choose a start date.");
    onSave({ ...form, due_date: calculateDueDate(form.start_date, months), name: form.name.trim(), principal_amount: String(principal), monthly_interest_rate: String(rate), term_months: String(months) });
  }
  const currency = accounts.find(a => a.id === form.account_id)?.currency ?? "PHP";
  const estimate = monthlyEstimate(Number(form.principal_amount) || 0, Number(form.monthly_interest_rate) || 0, Number(form.term_months) || 0, form.interest_type);
  const calculatedDueDate = calculateDueDate(form.start_date, Number(form.term_months));
  return <Dialog open={open} onClose={saving ? undefined : onClose} fullWidth maxWidth="sm">
    <Box component="form" onSubmit={submit}>
      <DialogTitle sx={{ fontWeight: 800 }}>{initial.name ? "Edit loan" : "Add a loan"}</DialogTitle>
      <DialogContent><Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Record the original loan details. Repayments are recorded separately.</Typography>
        <Stack spacing={2}>
          <TextField label="Loan name" placeholder="e.g. Personal loan, Car loan" value={form.name} onChange={e => setForm(v => ({ ...v, name: e.target.value }))} fullWidth required inputProps={{ maxLength: 100 }} />
          <TextField select label="Linked account" value={form.account_id} onChange={e => setForm(v => ({ ...v, account_id: e.target.value }))} fullWidth>{accounts.map(a => <MenuItem key={a.id} value={a.id}>{a.name} · {a.currency}</MenuItem>)}</TextField>
          <TextField label="Principal amount" type="number" value={form.principal_amount} onChange={e => setForm(v => ({ ...v, principal_amount: e.target.value }))} fullWidth required inputProps={{ min: "0.01", step: "0.01" }} InputProps={{ startAdornment: <Typography color="text.secondary" sx={{ mr: 1 }}>{currency}</Typography> }} />
          <TextField select label="Interest calculation method" value={form.interest_type} onChange={e => setForm(v => ({ ...v, interest_type: e.target.value as InterestType }))} fullWidth>
            <MenuItem value="flat_rate">Flat Rate — fixed interest for the full term</MenuItem>
            <MenuItem value="reducing_balance">Reducing Balance — interest decreases as principal is repaid</MenuItem>
          </TextField>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <TextField label="Monthly interest rate (%)" type="number" value={form.monthly_interest_rate} onChange={e => setForm(v => ({ ...v, monthly_interest_rate: e.target.value }))} fullWidth required inputProps={{ min: "0", max: "100", step: "0.01" }} />
            <TextField label="Term (months)" type="number" value={form.term_months} onChange={e => setForm(v => ({ ...v, term_months: e.target.value }))} fullWidth required inputProps={{ min: "1", max: "600", step: "1" }} />
          </Stack>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <TextField label="Start date" type="date" value={form.start_date} onChange={e => setForm(v => ({ ...v, start_date: e.target.value }))} fullWidth InputLabelProps={{ shrink: true }} />
            <TextField label="Final due date (calculated)" type="date" value={calculatedDueDate} fullWidth disabled InputLabelProps={{ shrink: true }} />
          </Stack>
          <TextField label="Notes (optional)" value={form.notes} onChange={e => setForm(v => ({ ...v, notes: e.target.value }))} fullWidth multiline minRows={2} inputProps={{ maxLength: 500 }} />
          <Paper variant="outlined" sx={{ p: 1.7, borderRadius: 2 }}><Typography variant="caption" color="text.secondary">Estimated monthly installment</Typography><Typography variant="h6" fontWeight={800}>{money(estimate, currency)}</Typography><Typography variant="caption" color="text.secondary">{form.interest_type === "flat_rate" ? "Flat interest is calculated on the original principal for the full term." : "Reducing-balance interest is estimated against the remaining principal."} Actual lender terms may differ.</Typography></Paper>
          {formError && <Alert severity="error">{formError}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}><Button color="inherit" onClick={onClose} disabled={saving}>Cancel</Button><Button type="submit" variant="contained" disabled={saving}>{saving ? <CircularProgress size={18} color="inherit" /> : "Save loan"}</Button></DialogActions>
    </Box>
  </Dialog>;
}

function PaymentDialog({ open, loan, currency, remainingPrincipal, accruedInterest, flatInterestAccrued, totalInterestPaid, lastPaymentDate, saving, onClose, onSave }: {
  open: boolean; loan: Loan | null; currency: string; remainingPrincipal: number;
  accruedInterest: number; flatInterestAccrued: number; totalInterestPaid: number; lastPaymentDate: string;
  saving: boolean; onClose: () => void; onSave: (value: PaymentForm) => void;
}) {
  const [form, setForm] = useState<PaymentForm>(emptyPayment());
  const [formError, setFormError] = useState("");
  useEffect(() => { if (open) { setForm({ ...emptyPayment(), payment_date: lastPaymentDate > today() ? lastPaymentDate : today() }); setFormError(""); } }, [open, loan?.id, lastPaymentDate]);
  const amount = Number(form.amount) || 0;
  const elapsedMonths = monthsBetween(lastPaymentDate, form.payment_date);
  const monthlyRate = (Number(loan?.monthly_interest_rate) || 0) / 100;
  const flatTotalInterest = roundMoney(Number(loan?.principal_amount ?? 0) * monthlyRate * Number(loan?.term_months ?? 0));
  const accruedInterestDue = loan?.interest_type === "flat_rate"
    ? roundMoney(Math.max(0, Math.min(flatTotalInterest, flatInterestAccrued + Number(loan?.principal_amount ?? 0) * monthlyRate * elapsedMonths) - totalInterestPaid))
    : roundMoney(accruedInterest + remainingPrincipal * monthlyRate * elapsedMonths);
  const principalPaid = roundMoney(Math.min(Math.max(0, amount - accruedInterestDue), remainingPrincipal));
  const futureFlatInterest = loan?.interest_type === "flat_rate"
    ? Math.max(0, flatTotalInterest - totalInterestPaid - accruedInterestDue)
    : 0;
  const futureInterestPaid = roundMoney(Math.min(Math.max(0, amount - accruedInterestDue - principalPaid), futureFlatInterest));
  const interestPaid = roundMoney(Math.min(amount, accruedInterestDue) + futureInterestPaid);
  const remainingAfterPayment = roundMoney(Math.max(0, remainingPrincipal - principalPaid));
  const maxPayable = loan?.interest_type === "flat_rate"
    ? remainingPrincipal + Math.max(0, flatTotalInterest - totalInterestPaid)
    : remainingPrincipal + accruedInterestDue;
  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.payment_date) return setFormError("Choose the payment date.");
    if (form.payment_date < lastPaymentDate) return setFormError("Payment date cannot be earlier than the previous payment.");
    if (form.payment_date < (loan?.start_date ?? lastPaymentDate)) return setFormError("Payment date cannot be before the loan start date.");
    if (!Number.isFinite(amount) || amount <= 0) return setFormError("Enter a payment amount greater than zero.");
    if (amount > maxPayable + 0.009) return setFormError("Payment cannot exceed the remaining loan obligation.");
    onSave(form);
  }
  return <Dialog open={open} onClose={saving ? undefined : onClose} fullWidth maxWidth="sm">
    <Box component="form" onSubmit={submit}>
      <DialogTitle sx={{ fontWeight: 800 }}>Record a loan payment</DialogTitle>
      <DialogContent><Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{loan?.name} · Outstanding principal {money(remainingPrincipal, currency)}</Typography>
        <Stack spacing={2}>
          <TextField label="Total amount paid" type="number" value={form.amount} onChange={e => setForm(v => ({ ...v, amount: e.target.value }))} fullWidth required inputProps={{ min: "0.01", step: "0.01" }} InputProps={{ startAdornment: <Typography color="text.secondary" sx={{ mr: 1 }}>{currency}</Typography> }} />
          <Paper variant="outlined" sx={{ p: 1.7, borderRadius: 2 }}>
            <Typography variant="caption" color="text.secondary">Estimated payment allocation</Typography>
            <Stack direction="row" justifyContent="space-between" sx={{ mt: 1 }}><Typography variant="body2" color="text.secondary">Interest portion</Typography><Typography fontWeight={750}>{money(interestPaid, currency)}</Typography></Stack>
            <Stack direction="row" justifyContent="space-between"><Typography variant="body2" color="text.secondary">Principal portion</Typography><Typography fontWeight={750}>{money(principalPaid, currency)}</Typography></Stack>
            <Divider sx={{ my: 1 }} />
            <Stack direction="row" justifyContent="space-between"><Typography variant="body2" color="text.secondary">Principal remaining</Typography><Typography fontWeight={800}>{money(remainingAfterPayment, currency)}</Typography></Stack>
            {amount > 0 && amount < accruedInterestDue && <Typography variant="caption" color="warning.main" display="block" sx={{ mt: 1 }}>The payment is below accrued interest; the unpaid interest will carry forward.</Typography>}{futureInterestPaid > 0 && <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>This payment also settles part of the remaining fixed-term interest.</Typography>}
          </Paper>
          <Alert severity="info">{loan?.interest_type === "flat_rate" ? "Flat Rate accrues agreed interest against the original principal over the loan term." : "Reducing Balance calculates interest against the remaining principal."} Enter only the total amount paid; BudgetNest allocates it automatically.</Alert>
          <TextField label="Payment date" type="date" value={form.payment_date} onChange={e => setForm(v => ({ ...v, payment_date: e.target.value }))} fullWidth InputLabelProps={{ shrink: true }} inputProps={{ min: lastPaymentDate }} />
          <TextField label="Notes (optional)" value={form.notes} onChange={e => setForm(v => ({ ...v, notes: e.target.value }))} fullWidth inputProps={{ maxLength: 300 }} />
          {formError && <Alert severity="error">{formError}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}><Button color="inherit" onClick={onClose} disabled={saving}>Cancel</Button><Button type="submit" variant="contained" disabled={saving}>{saving ? <CircularProgress size={18} color="inherit" /> : "Record payment"}</Button></DialogActions>
    </Box>
  </Dialog>;
}

export function LoansManager() {
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
    setLoading(true); setError("");
    try {
      const data = await apiRequest<{ accounts: Account[]; loans: Loan[]; payments: Payment[] }>("/loans");
      setAccounts(data.accounts); setLoans(data.loans); setPayments(data.payments);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load loans.");
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { void loadData(); }, [loadData]);

  function openCreate() { setEditing(null); setLoanForm({ ...emptyLoan(), account_id: accounts.find(a => !a.is_archived)?.id ?? "" }); setLoanDialog(true); }
  function openEdit(loan: Loan) {
    setEditing(loan); setLoanForm({ account_id: loan.account_id, name: loan.name, principal_amount: String(loan.principal_amount), monthly_interest_rate: String(loan.monthly_interest_rate), interest_type: loan.interest_type ?? "reducing_balance", term_months: String(loan.term_months), start_date: loan.start_date, due_date: loan.due_date ?? "", notes: loan.notes ?? "", status: loan.status }); setMenu(null); setLoanDialog(true);
  }
  async function saveLoan(value: LoanForm) {
    setSaving(true); setError(""); setNotice("");
    const account = accounts.find(a => a.id === value.account_id);
    if (!account || (account.is_archived && (!editing || editing.account_id !== account.id))) {
      setError("Choose an active account."); setSaving(false); return;
    }
    const payload = {
      account_id: value.account_id, name: value.name,
      principal_amount: Number(value.principal_amount),
      monthly_interest_rate: Number(value.monthly_interest_rate), interest_type: value.interest_type,
      term_months: Number(value.term_months), start_date: value.start_date,
      due_date: calculateDueDate(value.start_date, Number(value.term_months)), notes: value.notes.trim() || null, status: value.status,
    };
    try {
      await apiRequest<{ loan: Loan }>(editing ? `/loans/${editing.id}` : "/loans", {
        method: editing ? "PUT" : "POST", body: JSON.stringify(payload),
      });
      setLoanDialog(false); setNotice(editing ? "Loan updated." : "Loan created."); await loadData();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to save loan."); }
    finally { setSaving(false); }
  }
  async function recordPayment(value: PaymentForm) {
    if (!paymentLoan) return;
    setSaving(true); setError("");
    try {
      await apiRequest<{ payment: Payment }>(`/loans/${paymentLoan.id}/payments`, {
        method: "POST",
        body: JSON.stringify({ amount: Number(value.amount), payment_date: value.payment_date, notes: value.notes.trim() || null }),
      });
      setPaymentDialog(false); setPaymentLoan(null); setNotice("Loan payment recorded and allocated automatically."); await loadData();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to record loan payment."); }
    finally { setSaving(false); }
  }
  async function deleteLoan() {
    if (!deleteTarget) return;
    setSaving(true); setError("");
    try {
      await apiRequest<void>(`/loans/${deleteTarget.id}`, { method: "DELETE" });
      setDeleteTarget(null); setNotice("Loan and its repayment history deleted."); await loadData();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to delete loan."); }
    finally { setSaving(false); }
  }
  async function deletePayment() {
    if (!paymentDeleteTarget) return;
    const payment = paymentDeleteTarget;
    setSaving(true); setError("");
    try {
      await apiRequest<void>(`/loans/${payment.loan_id}/payments/${payment.id}`, { method: "DELETE" });
      setPaymentDeleteTarget(null); setNotice("Payment deleted and subsequent automatic allocations recalculated."); await loadData();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to delete payment.");
      setPaymentDeleteTarget(null);
    } finally { setSaving(false); }
  }
  async function setStatus(loan: Loan, status: Status) {
    setMenu(null); setError("");
    try {
      await apiRequest<{ loan: Loan }>(`/loans/${loan.id}/status`, {
        method: "PATCH", body: JSON.stringify({ status }),
      });
      setNotice(status === "paid" ? "Loan marked as paid." : status === "paused" ? "Loan paused." : "Loan resumed.");
      await loadData();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to update loan status."); }
  }

  const accountById = useMemo(() => new Map(accounts.map(a => [a.id, a])), [accounts]);
  const rows = loans.map(loan => {
    const loanPayments = payments.filter(p => p.loan_id === loan.id);
    const principalPaid = loanPayments.reduce((sum, p) => sum + Number(p.principal_paid), 0);
    const interestPaid = loanPayments.reduce((sum, p) => sum + Number(p.interest_paid), 0);
    const paid = loanPayments.reduce((sum, p) => sum + Number(p.amount), 0);
    const snapshot = paymentSnapshot(loan, loanPayments);
    const remaining = snapshot.remainingPrincipal;
    const remainingInterest = loan.interest_type === "flat_rate" ? Math.max(0, roundMoney(Number(loan.principal_amount) * Number(loan.monthly_interest_rate) / 100 * Number(loan.term_months)) - interestPaid) : snapshot.accruedInterest;
    return { loan, loanPayments, principalPaid, interestPaid, paid, remaining, remainingInterest, accruedInterest: snapshot.accruedInterest, flatInterestAccrued: snapshot.flatInterestAccrued, totalInterestPaid: snapshot.totalInterestPaid, lastPaymentDate: snapshot.lastPaymentDate, account: accountById.get(loan.account_id), progress: Math.min(100, principalPaid / Number(loan.principal_amount) * 100) };
  });
  const filtered = rows.filter(r => (accountFilter === "all" || r.loan.account_id === accountFilter) && (statusFilter === "all" || r.loan.status === statusFilter) && (!search || [r.loan.name, r.account?.name].join(" ").toLowerCase().includes(search.toLowerCase())));
  const activeRows = rows.filter(r => r.loan.status === "active");
  const sumByCurrency = new Map<string, { remaining: number; interest: number }>();
  activeRows.forEach(r => { const c = r.account?.currency ?? "PHP"; const v = sumByCurrency.get(c) ?? { remaining: 0, interest: 0 }; v.remaining += r.remaining + r.remainingInterest; v.interest += r.interestPaid; sumByCurrency.set(c, v); });
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
      <Paper variant="outlined" sx={{ p: 2.3, borderRadius: 3 }}><Stack direction="row" alignItems="center" spacing={1.3}><Avatar sx={{ bgcolor: "action.hover", color: "warning.main" }}><TrendingDownRounded /></Avatar><Box><Typography variant="caption" color="text.secondary">Outstanding balance</Typography><Typography variant="h6" fontWeight={800} sx={{ fontSize: { xs: 18, sm: 20 } }}>{balanceLabel}</Typography></Box></Stack></Paper>
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
      {filtered.map(({ loan, loanPayments, principalPaid, interestPaid, paid, remaining, remainingInterest, accruedInterest, account, progress }) => {
        const currency = account?.currency ?? "PHP";
        const estimate = monthlyEstimate(Number(loan.principal_amount), Number(loan.monthly_interest_rate), Number(loan.term_months), loan.interest_type ?? "reducing_balance");
        const expandedNow = expanded === loan.id;
        return <Paper key={loan.id} variant="outlined" sx={{ p: 2.4, borderRadius: 3 }}>
          <Stack direction="row" spacing={1.2} alignItems="flex-start">
            <Avatar variant="rounded" sx={{ bgcolor: "action.hover", color: "primary.main" }}><PaymentsRounded /></Avatar>
            <Box sx={{ flex: 1, minWidth: 0 }}><Typography fontWeight={800}>{loan.name}</Typography><Typography variant="body2" color="text.secondary">{account?.name ?? "Unknown account"} · {loan.interest_type === "flat_rate" ? "Flat Rate" : "Reducing Balance"} · {Number(loan.monthly_interest_rate).toFixed(2)}% monthly · {loan.term_months} months</Typography></Box>
            <Chip size="small" variant="outlined" color={loan.status === "paid" ? "success" : loan.status === "paused" ? "default" : "primary"} label={loan.status.charAt(0).toUpperCase() + loan.status.slice(1)} />
            <IconButton size="small" aria-label={`Actions for ${loan.name}`} onClick={e => setMenu({ element: e.currentTarget, loan })}><MoreHorizRounded /></IconButton>
          </Stack>
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "repeat(2,minmax(0,1fr))", sm: "repeat(4,minmax(0,1fr))" }, gap: 2, mt: 2.2 }}>
            <Box><Typography variant="caption" color="text.secondary">Original principal</Typography><Typography fontWeight={800}>{money(Number(loan.principal_amount), currency)}</Typography></Box>
            <Box><Typography variant="caption" color="text.secondary">Principal paid</Typography><Typography fontWeight={800}>{money(principalPaid, currency)}</Typography></Box>
            <Box><Typography variant="caption" color="text.secondary">Outstanding</Typography><Typography fontWeight={800} color={remaining + remainingInterest > 0 ? "warning.main" : "success.main"}>{money(remaining + remainingInterest, currency)}</Typography></Box>
            <Box><Typography variant="caption" color="text.secondary">Est. monthly</Typography><Typography fontWeight={800}>{money(estimate, currency)}</Typography></Box>
          </Box>
          <LinearProgress variant="determinate" value={progress} color={loan.status === "paid" ? "success" : "primary"} sx={{ height: 8, borderRadius: 99, mt: 2, bgcolor: "action.hover" }} />
          <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ xs: "stretch", sm: "center" }} spacing={1} sx={{ mt: 1 }}>
            <Typography variant="caption" color="text.secondary">{progress.toFixed(0)}% principal repaid · {loan.due_date ? `Due ${dateLabel(loan.due_date)}` : `Started ${dateLabel(loan.start_date)}`}</Typography>
            <Stack direction="row" spacing={1}>
              <Button size="small" onClick={() => setExpanded(expandedNow ? null : loan.id)}>{expandedNow ? "Hide history" : `Payment history (${loanPayments.length})`}</Button>
              <Button size="small" variant="contained" onClick={() => { setPaymentLoan(loan); setPaymentDialog(true); }} disabled={loan.status === "paid" || (remaining <= 0 && remainingInterest <= 0)}>Record payment</Button>
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
    <PaymentDialog open={paymentDialog} loan={paymentLoan} currency={accountById.get(paymentLoan?.account_id ?? "")?.currency ?? "PHP"} remainingPrincipal={paymentLoan ? paymentSnapshot(paymentLoan, payments.filter(p => p.loan_id === paymentLoan.id)).remainingPrincipal : 0} accruedInterest={paymentLoan ? paymentSnapshot(paymentLoan, payments.filter(p => p.loan_id === paymentLoan.id)).accruedInterest : 0} flatInterestAccrued={paymentLoan ? paymentSnapshot(paymentLoan, payments.filter(p => p.loan_id === paymentLoan.id)).flatInterestAccrued : 0} totalInterestPaid={paymentLoan ? paymentSnapshot(paymentLoan, payments.filter(p => p.loan_id === paymentLoan.id)).totalInterestPaid : 0} lastPaymentDate={paymentLoan ? paymentSnapshot(paymentLoan, payments.filter(p => p.loan_id === paymentLoan.id)).lastPaymentDate : today()} saving={saving} onClose={() => { setPaymentDialog(false); setPaymentLoan(null); }} onSave={recordPayment} />
    <Dialog open={Boolean(deleteTarget)} onClose={() => !saving && setDeleteTarget(null)} maxWidth="xs" fullWidth><DialogTitle sx={{ fontWeight: 800 }}>Delete this loan?</DialogTitle><DialogContent><Typography variant="body2" color="text.secondary">This also deletes its repayment history. Your account transactions and balance will not be changed.</Typography></DialogContent><DialogActions sx={{ px: 3, pb: 2.5 }}><Button color="inherit" onClick={() => setDeleteTarget(null)} disabled={saving}>Cancel</Button><Button color="error" variant="contained" onClick={() => void deleteLoan()} disabled={saving}>{saving ? <CircularProgress size={18} color="inherit" /> : "Delete"}</Button></DialogActions></Dialog>
    <Dialog open={Boolean(paymentDeleteTarget)} onClose={() => !saving && setPaymentDeleteTarget(null)} maxWidth="xs" fullWidth><DialogTitle sx={{ fontWeight: 800 }}>Delete this payment?</DialogTitle><DialogContent><Typography variant="body2" color="text.secondary">The outstanding principal and loan status will be recalculated from the remaining payment records.</Typography></DialogContent><DialogActions sx={{ px: 3, pb: 2.5 }}><Button color="inherit" onClick={() => setPaymentDeleteTarget(null)} disabled={saving}>Cancel</Button><Button color="error" variant="contained" onClick={() => void deletePayment()} disabled={saving}>{saving ? <CircularProgress size={18} color="inherit" /> : "Delete payment"}</Button></DialogActions></Dialog>
  </Stack>;
}
