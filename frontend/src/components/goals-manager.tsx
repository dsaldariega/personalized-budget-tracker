"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AddRounded, DeleteOutlineRounded, EditOutlined, MoreHorizRounded,
  RefreshRounded, SavingsRounded, SearchRounded, TrendingUpRounded,
} from "@mui/icons-material";
import {
  Alert, Avatar, Box, Button, Chip, CircularProgress, Dialog, DialogActions,
  DialogContent, DialogTitle, Divider, IconButton, LinearProgress, Menu,
  MenuItem, Paper, Stack, TextField, Tooltip, Typography,
} from "@mui/material";
import { apiRequest } from "@/lib/api";
import { SuccessToast } from "@/components/success-toast";

type GoalStatus = "active" | "completed" | "paused";
type Account = { id: string; name: string; currency: string; is_archived: boolean };
type Goal = {
  id: string; user_id: string; account_id: string; name: string;
  target_amount: number; current_amount: number; target_date: string | null;
  status: GoalStatus; created_at: string;
};
type GoalForm = {
  account_id: string; name: string; target_amount: string;
  current_amount: string; target_date: string; status: GoalStatus;
};
const emptyForm = (): GoalForm => ({
  account_id: "", name: "", target_amount: "", current_amount: "0",
  target_date: "", status: "active",
});
function money(amount: number, currency: string) {
  try { return new Intl.NumberFormat("en-PH", { style: "currency", currency, maximumFractionDigits: 2 }).format(amount); }
  catch { return currency + " " + amount.toLocaleString("en-PH", { maximumFractionDigits: 2 }); }
}
function dateLabel(value: string) {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" });
}

function GoalDialog({
  open, accounts, initial, saving, onClose, onSave,
}: {
  open: boolean; accounts: Account[]; initial: GoalForm; saving: boolean;
  onClose: () => void; onSave: (value: GoalForm) => void;
}) {
  const [form, setForm] = useState(initial);
  const [formError, setFormError] = useState("");
  useEffect(() => { if (open) { setForm(initial); setFormError(""); } }, [initial, open]);
  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const target = Number(form.target_amount);
    const current = Number(form.current_amount);
    if (!form.account_id) return setFormError("Choose an account for this goal.");
    if (!form.name.trim()) return setFormError("Enter a goal name.");
    if (!Number.isFinite(target) || target <= 0) return setFormError("Enter a target amount greater than zero.");
    if (!Number.isFinite(current) || current < 0) return setFormError("Enter a valid amount already saved.");
    if (current > target) return setFormError("The amount saved cannot exceed the target. Increase the target amount if needed.");
    onSave({ ...form, name: form.name.trim(), target_amount: String(target), current_amount: String(current), status: current >= target ? "completed" : form.status });
  }
  return (
    <Dialog scroll="paper" open={open} onClose={saving ? undefined : onClose} fullWidth maxWidth="sm">
      <Box component="form" onSubmit={submit} sx={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
        <DialogTitle sx={{ fontWeight: 800 }}>{initial.name ? "Edit savings goal" : "Create a savings goal"}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Give your goal a name, choose where you’re saving, and set a target to work toward.
          </Typography>
          <Stack spacing={2}>
            <TextField label="Goal name" placeholder="e.g. Emergency fund, Japan trip" value={form.name} onChange={e => setForm(v => ({ ...v, name: e.target.value }))} fullWidth required inputProps={{ maxLength: 100 }} />
            <TextField select label="Linked account" value={form.account_id} onChange={e => setForm(v => ({ ...v, account_id: e.target.value }))} fullWidth>
              {accounts.map(a => <MenuItem key={a.id} value={a.id}>{a.name} · {a.currency}</MenuItem>)}
            </TextField>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField label="Target amount" type="number" value={form.target_amount} onChange={e => setForm(v => ({ ...v, target_amount: e.target.value }))} fullWidth required inputProps={{ min: "0.01", step: "0.01" }} InputProps={{ startAdornment: <Typography color="text.secondary" sx={{ mr: 1 }}>{accounts.find(a => a.id === form.account_id)?.currency ?? "¤"}</Typography> }} />
              <TextField label="Already saved" type="number" value={form.current_amount} onChange={e => setForm(v => ({ ...v, current_amount: e.target.value }))} fullWidth inputProps={{ min: "0", step: "0.01" }} InputProps={{ startAdornment: <Typography color="text.secondary" sx={{ mr: 1 }}>{accounts.find(a => a.id === form.account_id)?.currency ?? "¤"}</Typography> }} />
            </Stack>
            <TextField label="Target date (optional)" type="date" value={form.target_date} onChange={e => setForm(v => ({ ...v, target_date: e.target.value }))} fullWidth InputLabelProps={{ shrink: true }} />
            <TextField select label="Status" value={form.status} onChange={e => setForm(v => ({ ...v, status: e.target.value as GoalStatus }))} fullWidth>
              <MenuItem value="active">Active</MenuItem><MenuItem value="paused">Paused</MenuItem><MenuItem value="completed">Completed</MenuItem>
            </TextField>
            {formError && <Alert severity="error">{formError}</Alert>}
            <Alert severity="info">The saved amount tracks progress toward this goal. Updating it does not create a transaction or change your account balance.</Alert>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button color="inherit" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={saving}>{saving ? <CircularProgress size={18} color="inherit" /> : "Save goal"}</Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}

export function GoalsManager() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Goal | null>(null);
  const [form, setForm] = useState<GoalForm>(emptyForm());
  const [menu, setMenu] = useState<{ element: HTMLElement; goal: Goal } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Goal | null>(null);
  const [search, setSearch] = useState("");
  const [accountFilter, setAccountFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const data = await apiRequest<{ accounts: Account[]; goals: Goal[] }>("/goals");
      setAccounts(data.accounts); setGoals(data.goals);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load savings goals.");
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { void loadData(); }, [loadData]);

  function openCreate() {
    setEditing(null);
    setForm({ ...emptyForm(), account_id: accounts.find(a => !a.is_archived)?.id ?? "" });
    setDialogOpen(true);
  }
  function openEdit(goal: Goal) {
    setEditing(goal);
    setForm({ account_id: goal.account_id, name: goal.name, target_amount: String(goal.target_amount), current_amount: String(goal.current_amount), target_date: goal.target_date ?? "", status: goal.status });
    setMenu(null); setDialogOpen(true);
  }
  async function saveGoal(value: GoalForm) {
    setSaving(true); setError(""); setNotice("");
    const current = Number(value.current_amount), target = Number(value.target_amount);
    const payload = { account_id: value.account_id, name: value.name, target_amount: target, current_amount: current, target_date: value.target_date || null, status: current >= target ? "completed" : value.status };
    try {
      await apiRequest<{ goal: Goal }>(editing ? `/goals/${editing.id}` : "/goals", { method: editing ? "PUT" : "POST", body: JSON.stringify(payload) });
      setDialogOpen(false); setNotice(editing ? "Savings goal updated." : "Savings goal created."); await loadData();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to save savings goal."); }
    finally { setSaving(false); }
  }
  async function deleteGoal() {
    if (!deleteTarget) return;
    setSaving(true); setError("");
    try {
      await apiRequest<void>(`/goals/${deleteTarget.id}`, { method: "DELETE" });
      setDeleteTarget(null); setNotice("Savings goal deleted."); await loadData();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to delete savings goal."); setDeleteTarget(null);
    } finally { setSaving(false); }
  }
  async function setStatus(goal: Goal, status: GoalStatus) {
    setMenu(null); setError("");
    try {
      await apiRequest<{ goal: Goal }>(`/goals/${goal.id}/status`, { method: "PATCH", body: JSON.stringify({ status }) });
      setNotice(status === "completed" ? "Goal marked as completed." : status === "paused" ? "Goal paused." : "Goal resumed."); await loadData();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to update goal status."); }
  }

  const accountById = useMemo(() => new Map(accounts.map(a => [a.id, a])), [accounts]);
  const filtered = goals.filter(goal =>
    (accountFilter === "all" || goal.account_id === accountFilter) &&
    (statusFilter === "all" || goal.status === statusFilter) &&
    (!search || [goal.name, accountById.get(goal.account_id)?.name].join(" ").toLowerCase().includes(search.toLowerCase()))
  );
  const activeGoals = goals.filter(g => g.status === "active");
  const completedGoals = goals.filter(g => g.status === "completed");
  const totalProgressByCurrency = new Map<string, { saved: number; target: number }>();
  activeGoals.forEach(g => {
    const currency = accountById.get(g.account_id)?.currency ?? "PHP";
    const values = totalProgressByCurrency.get(currency) ?? { saved: 0, target: 0 };
    values.saved += Number(g.current_amount); values.target += Number(g.target_amount);
    totalProgressByCurrency.set(currency, values);
  });
  const progressLabels = Array.from(totalProgressByCurrency, ([currency, values]) => `${money(values.saved, currency)} / ${money(values.target, currency)}`).join(" · ") || "—";

  return (
    <Stack spacing={3}>
      <Stack direction={{ xs: "column", sm: "row" }} alignItems={{ xs: "stretch", sm: "center" }} justifyContent="space-between" spacing={2}>
        <Box><Typography variant="h4" fontWeight={700} letterSpacing={-0.8}>Savings goals</Typography><Typography color="text.secondary" sx={{ mt: 0.7 }}>Turn the things you’re saving for into clear, trackable milestones.</Typography></Box>
        <Button variant="contained" startIcon={<AddRounded />} onClick={openCreate} disabled={!accounts.some(a => !a.is_archived)}>Create goal</Button>
      </Stack>
      {error && <Alert severity="error" onClose={() => setError("")}>{error}</Alert>}
      <SuccessToast message={notice} onClose={() => setNotice("")} />
      {!accounts.some(a => !a.is_archived) && !loading && <Alert severity="info" action={<Button color="inherit" size="small" onClick={() => window.location.assign("/accounts")}>Go to accounts</Button>}>Add an active account before creating a savings goal.</Alert>}
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(3,minmax(0,1fr))" }, gap: 2 }}>
        <Paper variant="outlined" sx={{ p: 2.3, borderRadius: 1.5 }}><Stack direction="row" alignItems="center" spacing={1.3}><Avatar sx={{ bgcolor: "action.hover", color: "primary.main" }}><SavingsRounded /></Avatar><Box><Typography variant="caption" color="text.secondary">Active goals</Typography><Typography variant="h6" fontWeight={700}>{activeGoals.length}</Typography></Box></Stack></Paper>
        <Paper variant="outlined" sx={{ p: 2.3, borderRadius: 1.5 }}><Stack direction="row" alignItems="center" spacing={1.3}><Avatar sx={{ bgcolor: "action.hover", color: "success.main" }}><TrendingUpRounded /></Avatar><Box><Typography variant="caption" color="text.secondary">Saved / active targets</Typography><Typography variant="h6" fontWeight={700} sx={{ fontSize: { xs: 17, sm: 20 } }}>{progressLabels}</Typography></Box></Stack></Paper>
        <Paper variant="outlined" sx={{ p: 2.3, borderRadius: 1.5 }}><Stack direction="row" alignItems="center" spacing={1.3}><Avatar sx={{ bgcolor: "action.hover", color: "success.main" }}><SavingsRounded /></Avatar><Box><Typography variant="caption" color="text.secondary">Completed goals</Typography><Typography variant="h6" fontWeight={700}>{completedGoals.length}</Typography></Box></Stack></Paper>
      </Box>
      <Stack direction={{ xs: "column", md: "row" }} alignItems={{ xs: "stretch", md: "center" }} justifyContent="space-between" spacing={1.5}>
        <Box><Typography variant="h6" fontWeight={700}>Your goals</Typography><Typography variant="body2" color="text.secondary">{filtered.length} {filtered.length === 1 ? "goal" : "goals"}</Typography></Box>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
          <TextField size="small" placeholder="Search goals" value={search} onChange={e => setSearch(e.target.value)} InputProps={{ startAdornment: <SearchRounded fontSize="small" sx={{ mr: 1, color: "text.secondary" }} /> }} />
          <TextField select size="small" label="Account" value={accountFilter} onChange={e => setAccountFilter(e.target.value)} sx={{ minWidth: 145 }}><MenuItem value="all">All accounts</MenuItem>{accounts.map(a => <MenuItem key={a.id} value={a.id}>{a.name}</MenuItem>)}</TextField>
          <TextField select size="small" label="Status" value={statusFilter} onChange={e => setStatusFilter(e.target.value)} sx={{ minWidth: 135 }}><MenuItem value="all">All statuses</MenuItem><MenuItem value="active">Active</MenuItem><MenuItem value="paused">Paused</MenuItem><MenuItem value="completed">Completed</MenuItem></TextField>
          <Tooltip title="Refresh"><IconButton onClick={() => void loadData()} disabled={loading}><RefreshRounded /></IconButton></Tooltip>
        </Stack>
      </Stack>
      {loading ? <Paper sx={{ minHeight: 220, display: "grid", placeItems: "center", borderRadius: 1.5 }}><CircularProgress size={28} /></Paper> : filtered.length === 0 ? (
        <Paper variant="outlined" sx={{ p: { xs: 3, md: 5 }, minHeight: 250, display: "grid", placeItems: "center", textAlign: "center", borderRadius: 1.5 }}>
          <Stack alignItems="center" spacing={1.2} sx={{ maxWidth: 410 }}><Avatar variant="rounded" sx={{ width: 58, height: 58, bgcolor: "action.hover", color: "text.secondary" }}><SavingsRounded fontSize="large" /></Avatar><Typography variant="h6">{goals.length ? "No matching goals" : "Start with your first savings goal"}</Typography><Typography color="text.secondary" variant="body2">{goals.length ? "Try adjusting your search or filters." : "Choose an account, set a target amount, and track your progress as you save."}</Typography>{goals.length === 0 && accounts.some(a => !a.is_archived) && <Button variant="contained" startIcon={<AddRounded />} onClick={openCreate} sx={{ mt: 1 }}>Create your first goal</Button>}</Stack>
        </Paper>
      ) : (
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "repeat(2,minmax(0,1fr))" }, gap: 2 }}>
          {filtered.map(goal => {
            const account = accountById.get(goal.account_id);
            const target = Number(goal.target_amount); const current = Number(goal.current_amount);
            const percent = Math.min(100, target > 0 ? current / target * 100 : 0);
            const remaining = Math.max(0, target - current);
            return <Paper key={goal.id} variant="outlined" sx={{ p: 2.4, borderRadius: 1.5, opacity: goal.status === "paused" ? 0.8 : 1 }}>
              <Stack direction="row" spacing={1.2} alignItems="flex-start">
                <Avatar variant="rounded" sx={{ bgcolor: "action.hover", color: "primary.main" }}><SavingsRounded /></Avatar>
                <Box sx={{ flex: 1, minWidth: 0 }}><Typography fontWeight={700}>{goal.name}</Typography><Typography variant="body2" color="text.secondary">{account?.name ?? "Unknown account"}{goal.target_date ? ` · Target ${dateLabel(goal.target_date)}` : ""}</Typography></Box>
                <IconButton size="small" aria-label={`Actions for ${goal.name}`} onClick={e => setMenu({ element: e.currentTarget, goal })}><MoreHorizRounded /></IconButton>
              </Stack>
              <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mt: 2.2, mb: 0.7 }}>
                <Typography variant="caption" color="text.secondary">Savings progress</Typography>
                <Chip size="small" variant="outlined" color={goal.status === "completed" ? "success" : goal.status === "paused" ? "default" : "primary"} label={goal.status.charAt(0).toUpperCase() + goal.status.slice(1)} />
              </Stack>
              <Typography variant="h5" fontWeight={700} letterSpacing={-0.5}>{money(current, account?.currency ?? "PHP")} <Typography component="span" color="text.secondary" variant="body2" fontWeight={500}>of {money(target, account?.currency ?? "PHP")}</Typography></Typography>
              <LinearProgress variant="determinate" value={percent} color={goal.status === "completed" ? "success" : "primary"} sx={{ height: 9, borderRadius: 99, mt: 1.6, bgcolor: "action.hover" }} />
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 1.2 }}>
                <Typography variant="caption" color="text.secondary">{percent.toFixed(0)}% saved</Typography>
                <Typography variant="body2" fontWeight={600} color="text.primary">{goal.status === "completed" ? "Target reached" : goal.status === "paused" ? "Paused" : `${money(remaining, account?.currency ?? "PHP")} to go`}</Typography>
              </Stack>
            </Paper>;
          })}
        </Box>
      )}
      <Menu anchorEl={menu?.element ?? null} open={Boolean(menu)} onClose={() => setMenu(null)}>
        <MenuItem onClick={() => menu && openEdit(menu.goal)}><EditOutlined fontSize="small" sx={{ mr: 1 }} /> Edit goal</MenuItem>
        {menu?.goal.status !== "active" && <MenuItem onClick={() => menu && void setStatus(menu.goal, "active")}>Resume goal</MenuItem>}
        {menu?.goal.status === "active" && <MenuItem onClick={() => menu && void setStatus(menu.goal, "paused")}>Pause goal</MenuItem>}
        {menu?.goal.status !== "completed" && <MenuItem onClick={() => menu && void setStatus(menu.goal, "completed")}>Mark completed</MenuItem>}
        <Divider />
        <MenuItem sx={{ color: "error.main" }} onClick={() => { setDeleteTarget(menu?.goal ?? null); setMenu(null); }}><DeleteOutlineRounded fontSize="small" sx={{ mr: 1 }} /> Delete goal</MenuItem>
      </Menu>
      <GoalDialog open={dialogOpen} accounts={accounts.filter(a => !a.is_archived || a.id === editing?.account_id)} initial={form} saving={saving} onClose={() => setDialogOpen(false)} onSave={saveGoal} />
      <Dialog scroll="paper" open={Boolean(deleteTarget)} onClose={() => !saving && setDeleteTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>Delete this savings goal?</DialogTitle>
        <DialogContent><Typography variant="body2" color="text.secondary">This removes the goal and its progress record. Your account balance and transactions will not be affected.</Typography></DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}><Button color="inherit" onClick={() => setDeleteTarget(null)} disabled={saving}>Cancel</Button><Button color="error" variant="contained" onClick={() => void deleteGoal()} disabled={saving}>{saving ? <CircularProgress size={18} color="inherit" /> : "Delete"}</Button></DialogActions>
      </Dialog>
    </Stack>
  );
}
