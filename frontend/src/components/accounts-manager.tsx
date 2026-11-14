"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AccountBalanceOutlined,
  AddRounded,
  ArchiveOutlined,
  AttachMoneyRounded,
  AccountBalanceWalletOutlined,
  CreditCardOutlined,
  DeleteOutlineRounded,
  EditOutlined,
  MoreHorizRounded,
  PaymentsOutlined,
  RefreshRounded,
  SavingsOutlined,
  WalletOutlined,
} from "@mui/icons-material";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  IconButton,
  InputAdornment,
  InputLabel,
  Menu,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { apiRequest } from "@/lib/api";
import { SuccessToast } from "@/components/success-toast";

type AccountType = "cash" | "bank" | "e_wallet" | "credit" | "investment" | "other";

type Account = {
  id: string;
  name: string;
  account_type: AccountType;
  currency: string;
  opening_balance: number;
  is_archived: boolean;
  created_at: string;
};

type AccountForm = {
  name: string;
  account_type: AccountType;
  currency: string;
  opening_balance: string;
};

type BalanceTransaction = {
  account_id: string;
  transaction_type: "income" | "expense" | "transfer";
  amount: number;
  transfer_direction: "in" | "out" | null;
};

const accountTypes: { value: AccountType; label: string }[] = [
  { value: "cash", label: "Cash" },
  { value: "bank", label: "Bank account" },
  { value: "e_wallet", label: "E-wallet" },
  { value: "credit", label: "Credit account" },
  { value: "investment", label: "Investment" },
  { value: "other", label: "Other" },
];

const emptyForm: AccountForm = {
  name: "",
  account_type: "bank",
  currency: "PHP",
  opening_balance: "0",
};

const typeIcon: Record<AccountType, typeof AccountBalanceWalletOutlined> = {
  cash: WalletOutlined,
  bank: AccountBalanceOutlined,
  e_wallet: PaymentsOutlined,
  credit: CreditCardOutlined,
  investment: SavingsOutlined,
  other: AccountBalanceWalletOutlined,
};

function formatMoney(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString("en-PH", { maximumFractionDigits: 2 })}`;
  }
}

function AccountDialog({
  open,
  initialValue,
  saving,
  onClose,
  onSave,
}: {
  open: boolean;
  initialValue: AccountForm;
  saving: boolean;
  onClose: () => void;
  onSave: (value: AccountForm) => void;
}) {
  const [form, setForm] = useState(initialValue);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    if (open) {
      setForm(initialValue);
      setFormError("");
    }
  }, [initialValue, open]);

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = form.name.trim();
    const currency = form.currency.trim().toUpperCase();
    const balance = Number(form.opening_balance);

    if (!name) return setFormError("Enter an account name.");
    if (!/^[A-Z]{3}$/.test(currency)) return setFormError("Currency must be a 3-letter code, such as PHP or USD.");
    if (!Number.isFinite(balance)) return setFormError("Enter a valid starting balance.");

    onSave({ ...form, name, currency, opening_balance: String(balance) });
  }

  return (
    <Dialog scroll="paper" open={open} onClose={saving ? undefined : onClose} fullWidth maxWidth="sm">
      <Box component="form" onSubmit={submit} sx={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
        <DialogTitle sx={{ pb: 1, fontWeight: 800 }}>
          {initialValue.name ? "Edit account" : "Add an account"}
        </DialogTitle>
        <DialogContent>
          <Typography color="text.secondary" variant="body2" sx={{ mb: 2.5 }}>
            Add a place where you keep or manage your money.
          </Typography>
          <Stack spacing={2}>
            <TextField
              label="Account name"
              placeholder="e.g. Main Savings, GCash, Wallet"
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              required
              autoFocus
              fullWidth
              inputProps={{ maxLength: 80 }}
            />
            <FormControl fullWidth>
              <InputLabel id="account-type-label">Account type</InputLabel>
              <Select
                labelId="account-type-label"
                label="Account type"
                value={form.account_type}
                onChange={(event) => setForm((current) => ({ ...current, account_type: event.target.value as AccountType }))}
              >
                {accountTypes.map((type) => <MenuItem key={type.value} value={type.value}>{type.label}</MenuItem>)}
              </Select>
            </FormControl>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField
                label="Currency"
                value={form.currency}
                onChange={(event) => setForm((current) => ({ ...current, currency: event.target.value.toUpperCase().slice(0, 3) }))}
                helperText="3-letter code, e.g. PHP"
                fullWidth
                inputProps={{ maxLength: 3 }}
              />
              <TextField
                label="Starting balance"
                type="number"
                value={form.opening_balance}
                onChange={(event) => setForm((current) => ({ ...current, opening_balance: event.target.value }))}
                fullWidth
                inputProps={{ step: "0.01" }}
                InputProps={{ startAdornment: <InputAdornment position="start">{form.currency || "¤"}</InputAdornment> }}
              />
            </Stack>
            {formError && <Alert severity="error">{formError}</Alert>}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={onClose} disabled={saving} color="inherit">Cancel</Button>
          <Button type="submit" variant="contained" disabled={saving}>
            {saving ? <CircularProgress size={19} color="inherit" /> : "Save account"}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}

export function AccountsManager() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [defaultCurrency, setDefaultCurrency] = useState("PHP");
  const [transactions, setTransactions] = useState<BalanceTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [formSeed, setFormSeed] = useState<AccountForm>(emptyForm);
  const [activeMenu, setActiveMenu] = useState<{ element: HTMLElement; account: Account } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Account | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadAccounts = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await apiRequest<{
        accounts: Account[];
        transactions: BalanceTransaction[];
        defaultCurrency: string;
      }>("/accounts");
      setAccounts(result.accounts);
      setTransactions(result.transactions);
      setDefaultCurrency(result.defaultCurrency || "PHP");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load accounts.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAccounts();
  }, [loadAccounts]);

  function openCreate() {
    setEditingAccount(null);
    setFormSeed({ ...emptyForm, currency: defaultCurrency });
    setDialogOpen(true);
  }

  function openEdit(account: Account) {
    setEditingAccount(account);
    setFormSeed({
      name: account.name,
      account_type: account.account_type,
      currency: account.currency,
      opening_balance: String(account.opening_balance),
    });
    setActiveMenu(null);
    setDialogOpen(true);
  }

  async function saveAccount(value: AccountForm) {
    setSaving(true);
    setError("");
    setNotice("");

    const payload = {
      name: value.name,
      account_type: value.account_type,
      currency: value.currency,
      opening_balance: Number(value.opening_balance),
    };

    try {
      if (editingAccount) {
        await apiRequest(`/accounts/${encodeURIComponent(editingAccount.id)}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
      } else {
        await apiRequest("/accounts", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }

      setDialogOpen(false);
      setNotice(editingAccount ? "Account updated." : "Account added.");
      await loadAccounts();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save account.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleArchive(account: Account) {
    setActiveMenu(null);
    try {
      await apiRequest(`/accounts/${encodeURIComponent(account.id)}/archive`, {
        method: "PATCH",
        body: JSON.stringify({ archived: !account.is_archived }),
      });
      setNotice(account.is_archived ? "Account restored." : "Account archived.");
      await loadAccounts();
    } catch (archiveError) {
      setError(archiveError instanceof Error ? archiveError.message : "Unable to update account status.");
    }
  }

  async function deleteAccount() {
    if (!deleteTarget) return;
    setSaving(true);
    setError("");
    try {
      await apiRequest<void>(`/accounts/${encodeURIComponent(deleteTarget.id)}`, {
        method: "DELETE",
      });
      setDeleteTarget(null);
      setNotice("Account deleted.");
      await loadAccounts();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Unable to delete account.");
      setDeleteTarget(null);
    } finally {
      setSaving(false);
    }
  }

  const visibleAccounts = accounts.filter((account) => showArchived || !account.is_archived);
  const activeAccounts = accounts.filter((account) => !account.is_archived);
  const currentBalance = (account: Account) => Number(account.opening_balance) + transactions
    .filter((transaction) => transaction.account_id === account.id)
    .reduce((sum, transaction) => {
      if (transaction.transaction_type === "income" || (transaction.transaction_type === "transfer" && transaction.transfer_direction === "in")) return sum + Number(transaction.amount);
      return sum - Number(transaction.amount);
    }, 0);
  const totalCurrentBalance = activeAccounts.reduce((sum, account) => sum + currentBalance(account), 0);
  const currencies = new Set(activeAccounts.map((account) => account.currency));
  const summaryBalance = currencies.size <= 1
    ? formatMoney(totalCurrentBalance, activeAccounts[0]?.currency ?? "PHP")
    : "Multiple currencies";

  return (
    <Stack spacing={3}>
      <Stack direction={{ xs: "column", sm: "row" }} alignItems={{ xs: "stretch", sm: "center" }} justifyContent="space-between" spacing={2}>
        <Box>
          <Typography variant="h4" fontWeight={700} letterSpacing={-0.8}>Accounts</Typography>
          <Typography color="text.secondary" sx={{ mt: 0.7 }}>Keep your cash, bank accounts, and e-wallets organized in one place.</Typography>
        </Box>
        <Button variant="contained" startIcon={<AddRounded />} onClick={openCreate} sx={{ alignSelf: { xs: "stretch", sm: "auto" } }}>
          Add account
        </Button>
      </Stack>

      {error && <Alert severity="error" onClose={() => setError("")}>{error}</Alert>}
      <SuccessToast message={notice} onClose={() => setNotice("")} />

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))" }, gap: 2 }}>
        <Paper sx={{ p: 2.5, borderRadius: 1.5 }}>
          <Stack direction="row" alignItems="center" spacing={1.2}>
            <Avatar variant="rounded" sx={{ bgcolor: "action.hover", color: "primary.main", width: 42, height: 42 }}><AccountBalanceWalletOutlined /></Avatar>
            <Box>
              <Typography variant="caption" color="text.secondary">Active accounts</Typography>
              <Typography variant="h5" fontWeight={700}>{activeAccounts.length}</Typography>
            </Box>
          </Stack>
        </Paper>
        <Paper sx={{ p: 2.5, borderRadius: 1.5 }}>
          <Stack direction="row" alignItems="center" spacing={1.2}>
            <Avatar variant="rounded" sx={{ bgcolor: "action.hover", color: "success.main", width: 42, height: 42 }}><AttachMoneyRounded /></Avatar>
            <Box>
              <Typography variant="caption" color="text.secondary">Combined current balance</Typography>
              <Typography variant="h5" fontWeight={700} sx={{ fontSize: { xs: 21, sm: 24 } }}>{summaryBalance}</Typography>
            </Box>
          </Stack>
        </Paper>
      </Box>

      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <Box>
          <Typography variant="h6" fontWeight={700}>Your accounts</Typography>
          <Typography variant="body2" color="text.secondary">{visibleAccounts.length} {visibleAccounts.length === 1 ? "account" : "accounts"} shown</Typography>
        </Box>
        <Stack direction="row" spacing={1} alignItems="center">
          <Button size="small" color="inherit" onClick={() => setShowArchived((value) => !value)}>
            {showArchived ? "Hide archived" : "Show archived"}
          </Button>
          <Tooltip title="Refresh accounts">
            <IconButton onClick={() => void loadAccounts()} disabled={loading} aria-label="Refresh accounts"><RefreshRounded /></IconButton>
          </Tooltip>
        </Stack>
      </Stack>

      {loading ? (
        <Paper sx={{ minHeight: 220, display: "grid", placeItems: "center", borderRadius: 1.5 }}>
          <CircularProgress size={28} />
        </Paper>
      ) : visibleAccounts.length === 0 ? (
        <Paper sx={{ p: { xs: 3, md: 5 }, minHeight: 260, display: "grid", placeItems: "center", textAlign: "center", borderRadius: 1.5 }}>
          <Stack alignItems="center" spacing={1.2} sx={{ maxWidth: 390 }}>
            <Avatar variant="rounded" sx={{ width: 58, height: 58, bgcolor: "action.hover", color: "text.secondary" }}><AccountBalanceWalletOutlined fontSize="large" /></Avatar>
            <Typography variant="h6">{showArchived ? "No archived accounts" : "Start with your first account"}</Typography>
            <Typography color="text.secondary" variant="body2">
              {showArchived ? "Accounts you archive will appear here." : "Add the places where you keep your money. You can connect transactions, budgets, and goals to an account later."}
            </Typography>
            {!showArchived && <Button variant="contained" startIcon={<AddRounded />} onClick={openCreate} sx={{ mt: 1 }}>Add your first account</Button>}
          </Stack>
        </Paper>
      ) : (
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))", xl: "repeat(3, minmax(0, 1fr))" }, gap: 2 }}>
          {visibleAccounts.map((account) => {
            const Icon = typeIcon[account.account_type] ?? AccountBalanceWalletOutlined;
            return (
              <Paper key={account.id} sx={{ p: 2.3, borderRadius: 1.5, opacity: account.is_archived ? 0.68 : 1, transition: "border-color 160ms ease, transform 160ms ease", "&:hover": { borderColor: "primary.main", transform: "translateY(-2px)" } }} variant="outlined">
                <Stack direction="row" alignItems="flex-start" spacing={1.5}>
                  <Avatar variant="rounded" sx={{ width: 46, height: 46, bgcolor: "action.hover", color: "primary.main" }}><Icon /></Avatar>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography fontWeight={600} noWrap>{account.name}</Typography>
                    <Typography variant="caption" color="text.secondary">{accountTypes.find((type) => type.value === account.account_type)?.label ?? "Account"}</Typography>
                  </Box>
                  <IconButton size="small" aria-label={`Actions for ${account.name}`} onClick={(event) => setActiveMenu({ element: event.currentTarget, account })}><MoreHorizRounded /></IconButton>
                </Stack>
                <Divider sx={{ my: 2 }} />
                <Typography variant="caption" color="text.secondary">Current balance</Typography>
                <Typography variant="h5" fontWeight={700} letterSpacing={-0.5} sx={{ mt: 0.35 }}>
                  {formatMoney(currentBalance(account), account.currency)}
                </Typography>
                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mt: 2 }}>
                  <Chip size="small" label={account.currency} variant="outlined" />
                  {account.is_archived && <Chip size="small" label="Archived" color="default" />}
                </Stack>
              </Paper>
            );
          })}
        </Box>
      )}

      <Menu anchorEl={activeMenu?.element ?? null} open={Boolean(activeMenu)} onClose={() => setActiveMenu(null)}>
        <MenuItem onClick={() => activeMenu && openEdit(activeMenu.account)}><EditOutlined fontSize="small" sx={{ mr: 1.2 }} /> Edit account</MenuItem>
        <MenuItem onClick={() => activeMenu && void toggleArchive(activeMenu.account)}><ArchiveOutlined fontSize="small" sx={{ mr: 1.2 }} /> {activeMenu?.account.is_archived ? "Restore account" : "Archive account"}</MenuItem>
        <Divider />
        <MenuItem sx={{ color: "error.main" }} onClick={() => { setDeleteTarget(activeMenu?.account ?? null); setActiveMenu(null); }}><DeleteOutlineRounded fontSize="small" sx={{ mr: 1.2 }} /> Delete account</MenuItem>
      </Menu>

      <AccountDialog
        open={dialogOpen}
        initialValue={formSeed}
        saving={saving}
        onClose={() => setDialogOpen(false)}
        onSave={saveAccount}
      />

      <Dialog scroll="paper" open={Boolean(deleteTarget)} onClose={() => !saving && setDeleteTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle fontWeight={700}>Delete this account?</DialogTitle>
        <DialogContent>
          <Typography color="text.secondary" variant="body2">
            You are about to delete <strong>{deleteTarget?.name}</strong>. Accounts with linked transactions, budgets, goals, loans, or subscriptions cannot be deleted. You can archive them instead.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button color="inherit" onClick={() => setDeleteTarget(null)} disabled={saving}>Cancel</Button>
          <Button color="error" variant="contained" onClick={() => void deleteAccount()} disabled={saving}>
            {saving ? <CircularProgress size={18} color="inherit" /> : "Delete account"}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
