"use client";

import { AuthModal } from "@/components/auth-modal";
import { ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BackupOutlined, CheckCircleOutlineRounded, CloudDownloadOutlined, CloudUploadOutlined,
  DeleteOutlineRounded, LockOutlined, PaletteOutlined, PersonOutlineRounded, SecurityOutlined,
} from "@mui/icons-material";
import {
  Alert, Avatar, Box, Button, CircularProgress, Divider, MenuItem, Paper, Stack,
  TextField, Typography, Dialog, DialogTitle, DialogContent, DialogActions, List, ListItem, ListItemText,
} from "@mui/material";
import { createClient } from "@/lib/supabase/client";
import { apiRequest } from "@/lib/api";
import { SuccessToast } from "@/components/success-toast";
import { useThemeMode } from "@/components/theme-provider";

type Profile = { full_name: string; default_currency: string };
type ProfileResponse = { full_name: string | null; default_currency: string | null };
type Account = { id: string; name: string; currency: string; account_type: string; opening_balance: number; is_archived: boolean; created_at: string };
type Transaction = { id: string; account_id: string; transaction_type: string; amount: number; category: string | null; description: string | null; transaction_date: string; transfer_group_id: string | null; transfer_direction: string | null; created_at: string };
const currencies = ["PHP","USD","EUR","GBP","JPY","SGD","AUD","CAD","NZD","AED","INR"];
function csvEscape(value: unknown) {
  const text = value === null || value === undefined ? "" : typeof value === "object" ? JSON.stringify(value) : String(value);
  return /[",\r\n]/.test(text) ? '"' + text.replace(/"/g, '""') + '"' : text;
}
const transactionCsvHeaders = [
  "account_name", "currency", "transaction_type", "amount",
  "category", "description", "transaction_date",
];
function makeCsv(rows: Record<string, unknown>[], headers: string[] = transactionCsvHeaders) {
  return "\uFEFF" + [headers.map(csvEscape).join(","), ...rows.map(row => headers.map(header => csvEscape(row[header])).join(","))].join("\r\n");
}
function downloadFile(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url; anchor.download = filename; anchor.click();
  URL.revokeObjectURL(url);
}
function parseCsv(text: string) {
  const rows: string[][] = [];
  let row: string[] = [], field = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (char === '"') quoted = false;
      else field += char;
    } else if (char === '"') quoted = true;
    else if (char === ",") { row.push(field); field = ""; }
    else if (char === "\n") { row.push(field.replace(/\r$/, "")); rows.push(row); row = []; field = ""; }
    else field += char;
  }
  if (field.length || row.length) { row.push(field.replace(/\r$/, "")); rows.push(row); }
  return rows.filter(values => values.some(value => value.trim() !== ""));
}
type ImportIssue = { row?: number; field?: string; message: string };
function normalizeImportDate(value: string): { value?: string; error?: string } {
  const input = value.trim();
  const valid = (year: number, month: number, day: number) => {
    const date = new Date(Date.UTC(year, month - 1, day));
    return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
      ? date.toISOString().slice(0, 10) : undefined;
  };
  let match = input.match(/^([0-9]{4})[-/]([0-9]{1,2})[-/]([0-9]{1,2})$/);
  if (match) {
    const result = valid(Number(match[1]), Number(match[2]), Number(match[3]));
    return result ? { value: result } : { error: "Enter a real calendar date." };
  }
  match = input.match(/^([0-9]{1,2})[/-]([0-9]{1,2})[/-]([0-9]{4})$/);
  if (match) {
    const first = Number(match[1]), second = Number(match[2]), year = Number(match[3]);
    // For ambiguous slash/dash dates, use MM/DD/YYYY. If the first value
    // cannot be a month, treat the input as DD/MM/YYYY instead.
    const month = first > 12 ? second : first;
    const day = first > 12 ? first : second;
    const result = valid(year, month, day);
    return result ? { value: result } : { error: "Enter a real date (MM/DD/YYYY or YYYY-MM-DD)." };
  }
  if (/^[0-9]+(?:\.[0-9]+)?$/.test(input)) {
    const serial = Number(input);
    if (serial >= 20000 && serial <= 80000) {
      const date = new Date(Date.UTC(1899, 11, 30) + Math.round(serial) * 86400000);
      return { value: date.toISOString().slice(0, 10) };
    }
  }
  return { error: "Use YYYY-MM-DD or MM/DD/YYYY for the transaction date." };
}
function localDateStamp() {
  const now = new Date();
  return [now.getFullYear(), String(now.getMonth()+1).padStart(2,"0"), String(now.getDate()).padStart(2,"0")].join("");
}
export function SettingsManager() {
  const supabase = useMemo(() => createClient(), []);
  const { mode, toggleMode } = useThemeMode();
  const fileRef = useRef<HTMLInputElement>(null);
  const [email, setEmail] = useState("");
  const [profile, setProfile] = useState<Profile>({ full_name: "", default_currency: "PHP" });
  const [initialProfile, setInitialProfile] = useState<Profile>({ full_name: "", default_currency: "PHP" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [importSummary, setImportSummary] = useState("");
  const [importIssues, setImportIssues] = useState<ImportIssue[]>([]);
  const [importErrorOpen, setImportErrorOpen] = useState(false);
  const [userId, setUserId] = useState("");
  const [requiresLogin, setRequiresLogin] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);

  const loadProfile = useCallback(async () => {
    if (!supabase) { setRequiresLogin(true); setLoading(false); return; }
    setLoading(true); setError("");
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) { setRequiresLogin(true); setLoading(false); return; }
    setRequiresLogin(false);
    setUserId(user.id); setEmail(user.email ?? "");
    try {
      const result = await apiRequest<{ profile: ProfileResponse }>("/settings/profile");
      const value = { full_name: result.profile.full_name ?? user.user_metadata?.full_name ?? "", default_currency: result.profile.default_currency ?? "PHP" };
      setProfile(value); setInitialProfile(value);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load profile settings.");
    } finally { setLoading(false); }
  }, [supabase]);
  useEffect(() => { void loadProfile(); }, [loadProfile]);

  async function saveProfile() {
    if (!supabase || !userId) return;
    const name = profile.full_name?.trim() ?? "";
    if (!name) { setError("Please enter your name."); return; }
    if (!/^[A-Z]{3}$/.test(profile.default_currency)) { setError("Choose a valid three-letter currency code."); return; }
    setSaving(true); setError(""); setNotice("");
    try {
      await apiRequest("/settings/profile", { method: "PUT", body: JSON.stringify({ full_name: name, default_currency: profile.default_currency }) });
      const authUpdate = await supabase.auth.updateUser({ data: { full_name: name } });
      if (authUpdate.error) throw new Error("Profile saved, but the sign-in profile name could not be synchronized: " + authUpdate.error.message);
      setInitialProfile(profile); setNotice("Profile settings saved.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to save profile settings.");
    } finally { setSaving(false); }
  }

  async function exportBackup() {
    if (!supabase || !userId) return;
    setExporting(true); setError(""); setNotice("");
    let backup: Record<string, unknown>;
    let data: Record<string, unknown>;
    try {
      const response = await apiRequest<{ backup: Record<string, unknown> & { data: Record<string, unknown> } }>("/settings/backup");
      backup = response.backup;
      data = response.backup.data;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to export your data.");
      setExporting(false);
      return;
    }
    downloadFile("budgetnest-backup-" + localDateStamp() + ".json", JSON.stringify(backup, null, 2), "application/json;charset=utf-8");
    const tx = (data.transactions ?? []) as Transaction[];
    const accountRows = (data.accounts ?? []) as Account[];
    const names = new Map(accountRows.map(a => [a.id, a.name]));
    const csvRows = tx.filter(item => item.transaction_type === "income" || item.transaction_type === "expense").map(item => ({
      account_name: names.get(item.account_id) ?? "",
      currency: accountRows.find(a => a.id === item.account_id)?.currency ?? "",
      transaction_type: item.transaction_type,
      amount: Number(item.amount).toFixed(2),
      category: item.category ?? "",
      description: item.description ?? "",
      transaction_date: item.transaction_date.slice(0, 10),
    }));
    // Always include the import-compatible header, even when there are no income/expense rows.
    downloadFile("budgetnest-transactions-" + localDateStamp() + ".csv", makeCsv(csvRows), "text/csv;charset=utf-8");
    setNotice("Your full JSON backup and import-ready transaction CSV have been downloaded. Transfers are preserved in the JSON backup."); setExporting(false);
  }

  async function importTransactions(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !supabase || !userId) return;
    setImporting(true); setError(""); setNotice(""); setImportSummary(""); setImportIssues([]); setImportErrorOpen(false);
    try {
      if (file.size > 5 * 1024 * 1024) throw new Error("Please choose a CSV file smaller than 5 MB.");
      const raw = (await file.text()).replace(/^\uFEFF/, "");
      const parsed = parseCsv(raw);
      if (parsed.length < 2) throw new Error("The file does not contain any transaction rows.");
      const headers = parsed[0].map(value => value.trim().toLowerCase());
      const required = ["account_name","currency","transaction_type","amount","category","description","transaction_date"];
      const missing = required.filter(header => !headers.includes(header));
      if (missing.length) throw new Error("Missing required CSV columns: " + missing.join(", "));
      if (parsed.length > 5001) throw new Error("Import is limited to 5,000 rows at a time.");
      const column = (row: string[], name: string) => row[headers.indexOf(name)]?.trim() ?? "";
      const localIssues: ImportIssue[] = [];
      const rows = parsed.slice(1).map((row, index) => {
        const sourceDate = column(row, "transaction_date");
        const normalizedDate = normalizeImportDate(sourceDate);
        if (!normalizedDate.value) localIssues.push({ row: index + 2, field: "transaction_date", message: normalizedDate.error ?? "Invalid date." });
        return {
          account_name: column(row, "account_name"),
          currency: column(row, "currency").toUpperCase(),
          transaction_type: column(row, "transaction_type").toLowerCase(),
          amount: Number(column(row, "amount")),
          category: column(row, "category"),
          description: column(row, "description"),
          transaction_date: normalizedDate.value ?? sourceDate,
        };
      });
      if (localIssues.length) {
        setError("Please correct the transaction dates listed below and try again.");
        setImportIssues(localIssues);
        setImportErrorOpen(true);
        return;
      }
      const result = await apiRequest<{ imported: number; skipped_duplicates: number }>("/settings/transactions/import", {
        method: "POST", body: JSON.stringify({ rows, source_file: file.name }),
      });
      setImportSummary("Imported " + result.imported + " transaction(s); skipped " + result.skipped_duplicates + " duplicate(s).");
      setNotice("Transaction import completed."); 
    } catch (cause) {
      const failure = cause as Error & { issues?: ImportIssue[] };
      setImportIssues(Array.isArray(failure.issues) ? failure.issues : []);
      setError(failure.message || "The file could not be imported.");
      setImportErrorOpen(true);
    } finally { setImporting(false); }
  }

  const dirty = profile.full_name !== initialProfile.full_name || profile.default_currency !== initialProfile.default_currency;
  if (requiresLogin) return (
    <Stack spacing={3}>
      <Box><Typography variant="h4" fontWeight={800} letterSpacing={-0.8}>Settings</Typography><Typography color="text.secondary" sx={{ mt: 0.7 }}>Manage your profile, preferences, and personal data.</Typography></Box>
      <Paper variant="outlined" sx={{ p: { xs: 3, md: 5 }, borderRadius: 3, textAlign: "center" }}>
        <Stack alignItems="center" spacing={1.5} sx={{ maxWidth: 520, mx: "auto" }}>
          <Avatar sx={{ width: 56, height: 56, bgcolor: "action.hover", color: "primary.main" }}><LockOutlined /></Avatar>
          <Typography variant="h6" fontWeight={800}>Login required</Typography>
          <Typography color="text.secondary">Please log in to use Profile, Data backup & transfer, and account management features. Your guest financial data can still be used while you try BudgetNest, but account settings belong to your signed-in account.</Typography>
          <Button variant="contained" onClick={() => setLoginOpen(true)}>Log in</Button>
          <AuthModal open={loginOpen} onClose={() => setLoginOpen(false)} />
        </Stack>
      </Paper>
    </Stack>
  );
  return (
    <Stack spacing={3}>
      <Box><Typography variant="h4" fontWeight={800} letterSpacing={-0.8}>Settings</Typography><Typography color="text.secondary" sx={{ mt: 0.7 }}>Manage your profile, preferences, and personal data.</Typography></Box>
      {error && <Alert severity="error" onClose={() => setError("")}>{error}</Alert>}
      <SuccessToast message={notice} onClose={() => setNotice("")} />
      {loading ? <Paper variant="outlined" sx={{ minHeight: 180, display: "grid", placeItems: "center", borderRadius: 3 }}><CircularProgress /></Paper> : (
        <>
          <Paper variant="outlined" sx={{ p: { xs: 2.5, md: 3 }, borderRadius: 3 }}>
            <Stack direction="row" alignItems="center" spacing={1.2} sx={{ mb: 2.5 }}><Avatar sx={{ bgcolor: "action.hover", color: "primary.main" }}><PersonOutlineRounded /></Avatar><Box><Typography variant="h6" fontWeight={800}>Profile</Typography><Typography variant="body2" color="text.secondary">Your personal details used across BudgetNest.</Typography></Box></Stack>
            <Stack spacing={2} maxWidth={620}>
              <TextField label="Full name" value={profile.full_name ?? ""} onChange={e => setProfile(v => ({ ...v, full_name: e.target.value }))} fullWidth inputProps={{ maxLength: 100 }} />
              <TextField label="Email address" value={email} fullWidth disabled helperText="Email changes are managed through your authentication provider." />
              <TextField select label="Default currency" value={profile.default_currency} onChange={e => setProfile(v => ({ ...v, default_currency: e.target.value }))} fullWidth>
                {currencies.map(currency => <MenuItem key={currency} value={currency}>{currency}</MenuItem>)}
              </TextField>
              <Box><Button variant="contained" onClick={() => void saveProfile()} disabled={!dirty || saving}>{saving ? <CircularProgress size={18} color="inherit" /> : "Save profile"}</Button></Box>
            </Stack>
          </Paper>
          <Paper variant="outlined" sx={{ p: { xs: 2.5, md: 3 }, borderRadius: 3 }}>
            <Stack direction="row" alignItems="center" spacing={1.2} sx={{ mb: 2 }}><Avatar sx={{ bgcolor: "action.hover", color: "primary.main" }}><PaletteOutlined /></Avatar><Box><Typography variant="h6" fontWeight={800}>Appearance</Typography><Typography variant="body2" color="text.secondary">Choose how BudgetNest looks on this device.</Typography></Box></Stack>
            <Stack direction={{ xs: "column", sm: "row" }} alignItems={{ xs: "stretch", sm: "center" }} justifyContent="space-between" spacing={2}>
              <Box><Typography fontWeight={700}>{mode === "dark" ? "Dark mode" : "Light mode"} is enabled</Typography><Typography variant="body2" color="text.secondary">Your preference is saved in this browser.</Typography></Box>
              <Button variant="outlined" onClick={toggleMode}>Switch to {mode === "dark" ? "light" : "dark"} mode</Button>
            </Stack>
          </Paper>
          <Paper variant="outlined" sx={{ p: { xs: 2.5, md: 3 }, borderRadius: 3 }}>
            <Stack direction="row" alignItems="center" spacing={1.2} sx={{ mb: 2 }}><Avatar sx={{ bgcolor: "action.hover", color: "primary.main" }}><BackupOutlined /></Avatar><Box><Typography variant="h6" fontWeight={800}>Data backup & transfer</Typography><Typography variant="body2" color="text.secondary">Download a copy of your data or import transactions from a spreadsheet.</Typography></Box></Stack>
            <Stack spacing={2}>
              <Alert severity="info">The backup is a JSON file containing your profile and financial records. The accompanying transaction CSV can be opened and edited in Microsoft Excel or Google Sheets. It includes income and expense rows; transfers are preserved in the JSON backup and should be recreated in the app to preserve both sides.</Alert>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} flexWrap="wrap">
                <Button variant="contained" startIcon={exporting ? <CircularProgress size={17} color="inherit" /> : <CloudDownloadOutlined />} onClick={() => void exportBackup()} disabled={exporting || importing}>{exporting ? "Preparing backup…" : "Export my data"}</Button>
                <Button variant="outlined" component="label" startIcon={importing ? <CircularProgress size={17} /> : <CloudUploadOutlined />} disabled={importing || exporting}>{importing ? "Importing…" : "Import transactions CSV"}<input ref={fileRef} hidden type="file" accept=".csv,text/csv" onChange={importTransactions} /></Button>
                <Button color="inherit" onClick={() => downloadFile("budgetnest-transaction-import-template.csv", "\uFEFFaccount_name,currency,transaction_type,amount,category,description,transaction_date\r\n", "text/csv;charset=utf-8")} disabled={importing || exporting}>Download CSV template</Button>
              </Stack>
              {importSummary && <Alert severity="success" icon={<CheckCircleOutlineRounded />}>{importSummary}</Alert>}
              <Typography variant="caption" color="text.secondary">Import requirements: account_name, currency, transaction_type, amount, category, description, transaction_date. Duplicate income/expense rows are skipped. Maximum file size: 5 MB / 5,000 rows.</Typography>
            </Stack>
          </Paper>
          <Paper variant="outlined" sx={{ p: { xs: 2.5, md: 3 }, borderRadius: 3 }}>
            <Stack direction="row" alignItems="center" spacing={1.2} sx={{ mb: 2 }}><Avatar sx={{ bgcolor: "action.hover", color: "primary.main" }}><SecurityOutlined /></Avatar><Box><Typography variant="h6" fontWeight={800}>Privacy & security</Typography><Typography variant="body2" color="text.secondary">Understand how your data is protected and manage your account safely.</Typography></Box></Stack>
            <Stack spacing={1.5}>
              <Stack direction="row" spacing={1.2} alignItems="flex-start"><LockOutlined color="action" /><Box><Typography fontWeight={700}>Private financial records</Typography><Typography variant="body2" color="text.secondary">Your records are protected by Supabase Row Level Security and are scoped to your signed-in account.</Typography></Box></Stack>
              <Divider />
              <Stack direction="row" spacing={1.2} alignItems="flex-start"><CloudDownloadOutlined color="action" /><Box><Typography fontWeight={700}>Your data belongs to you</Typography><Typography variant="body2" color="text.secondary">Use Export my data to download a copy of your profile, accounts, transactions, budgets, goals, loans, subscriptions, payments, and activity history.</Typography></Box></Stack>
              <Divider />
              <Stack direction="row" spacing={1.2} alignItems="flex-start"><DeleteOutlineRounded color="action" /><Box><Typography fontWeight={700}>Account deletion</Typography><Typography variant="body2" color="text.secondary">Permanent account deletion requires a trusted server-side operation so authentication and all related records can be removed together. It is not exposed as a browser-only action in this release. Export your data before requesting deletion.</Typography></Box></Stack>
              <Typography variant="caption" color="text.secondary">Signed-in account: {email || "—"}</Typography>
            </Stack>
          </Paper>
        </>
      )}
      <Dialog open={importErrorOpen} onClose={() => setImportErrorOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 800 }}>Import couldn&apos;t be completed</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            {error || "Please correct the following CSV entries and try again."}
          </Typography>
          {importIssues.length > 0 ? (
            <List dense disablePadding>
              {importIssues.map((issue, index) => (
                <ListItem key={index} alignItems="flex-start" divider={index < importIssues.length - 1} sx={{ px: 0 }}>
                  <ListItemText
                    primary={issue.row ? `CSV row ${issue.row}${issue.field ? " · " + issue.field.replaceAll("_", " ") : ""}` : issue.field ?? "Import"}
                    secondary={issue.message}
                    primaryTypographyProps={{ fontWeight: 700, variant: "body2" }}
                    secondaryTypographyProps={{ color: "error.main", variant: "body2" }}
                  />
                </ListItem>
              ))}
            </List>
          ) : <Typography variant="body2" color="error.main">{error}</Typography>}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button variant="contained" onClick={() => setImportErrorOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
