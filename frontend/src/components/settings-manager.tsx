"use client";

import { ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AccountCircleOutlined, BackupOutlined, CheckCircleOutlineRounded, CloudDownloadOutlined,
  CloudUploadOutlined, DeleteOutlineRounded, LockOutlined, PaletteOutlined, PersonOutlineRounded,
  RefreshRounded, SecurityOutlined, SettingsOutlined,
} from "@mui/icons-material";
import {
  Alert, Avatar, Box, Button, CircularProgress, Divider, MenuItem, Paper, Stack,
  TextField, Typography,
} from "@mui/material";
import { createClient } from "@/lib/supabase/client";
import { useThemeMode } from "@/components/theme-provider";

type Profile = { full_name: string | null; default_currency: string };
type Account = { id: string; name: string; currency: string; account_type: string; opening_balance: number; is_archived: boolean; created_at: string };
type Transaction = { id: string; account_id: string; transaction_type: string; amount: number; category: string | null; description: string | null; transaction_date: string; transfer_group_id: string | null; transfer_direction: string | null; created_at: string };
const currencies = ["PHP","USD","EUR","GBP","JPY","SGD","AUD","CAD","NZD","AED","INR"];
function csvEscape(value: unknown) {
  const text = value === null || value === undefined ? "" : typeof value === "object" ? JSON.stringify(value) : String(value);
  return /[",\r\n]/.test(text) ? '"' + text.replace(/"/g, '""') + '"' : text;
}
function makeCsv(rows: Record<string, unknown>[]) {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
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
function localDateStamp() {
  const now = new Date();
  return [now.getFullYear(), String(now.getMonth()+1).padStart(2,"0"), String(now.getDate()).padStart(2,"0")].join("");
}
function fingerprint(row: { account_id: string; transaction_type: string; amount: number; category: string | null; description: string | null; transaction_date: string }) {
  return [row.account_id,row.transaction_type,Number(row.amount).toFixed(2),row.category ?? "",row.description ?? "",row.transaction_date].join("|").toLowerCase();
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
  const [userId, setUserId] = useState("");

  const loadProfile = useCallback(async () => {
    if (!supabase) { setError("Supabase is not configured."); setLoading(false); return; }
    setLoading(true); setError("");
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) { setError("Your session could not be verified. Please sign in again."); setLoading(false); return; }
    setUserId(user.id); setEmail(user.email ?? "");
    const { data, error: profileError } = await supabase.from("profiles").select("full_name,default_currency").eq("id", user.id).single();
    if (profileError) setError(profileError.message);
    else {
      const value = { full_name: data.full_name ?? user.user_metadata?.full_name ?? "", default_currency: data.default_currency ?? "PHP" };
      setProfile(value); setInitialProfile(value);
    }
    setLoading(false);
  }, [supabase]);
  useEffect(() => { void loadProfile(); }, [loadProfile]);

  async function saveProfile() {
    if (!supabase || !userId) return;
    if (!profile.full_name.trim()) { setError("Please enter your name."); return; }
    if (!/^[A-Z]{3}$/.test(profile.default_currency)) { setError("Choose a valid three-letter currency code."); return; }
    setSaving(true); setError(""); setNotice("");
    const name = profile.full_name.trim();
    const result = await supabase.from("profiles").update({ full_name: name, default_currency: profile.default_currency }).eq("id", userId);
    if (result.error) { setError(result.error.message); setSaving(false); return; }
    const authUpdate = await supabase.auth.updateUser({ data: { full_name: name } });
    if (authUpdate.error) { setError("Profile saved, but the sign-in profile name could not be synchronized: " + authUpdate.error.message); setSaving(false); return; }
    await supabase.from("activity_logs").insert({ user_id: userId, action: "profile.updated", entity_type: "profile", details: { full_name: name, default_currency: profile.default_currency } });
    setInitialProfile(profile); setNotice("Profile settings saved."); setSaving(false);
  }

  async function exportBackup() {
    if (!supabase || !userId) return;
    setExporting(true); setError(""); setNotice("");
    const tables = ["profiles","accounts","transactions","budgets","savings_goals","loans","loan_payments","subscriptions","subscription_payments","activity_logs"];
    const backup: Record<string, unknown> = { format: "BudgetNest backup", version: 1, exported_at: new Date().toISOString(), user_id: userId, data: {} };
    const data = backup.data as Record<string, unknown>;
    for (const table of tables) {
      const column = table === "profiles" ? "id" : "user_id";
      const { data: rows, error: queryError } = await supabase.from(table).select("*").eq(column, userId);
      if (queryError) { setError("Could not export " + table + ": " + queryError.message); setExporting(false); return; }
      data[table] = rows ?? [];
    }
    downloadFile("budgetnest-backup-" + localDateStamp() + ".json", JSON.stringify(backup, null, 2), "application/json;charset=utf-8");
    const tx = (data.transactions ?? []) as Transaction[];
    const accountRows = (data.accounts ?? []) as Account[];
    const names = new Map(accountRows.map(a => [a.id, a.name]));
    const csvRows = tx.map(item => ({
      account_name: names.get(item.account_id) ?? "", currency: accountRows.find(a => a.id === item.account_id)?.currency ?? "",
      transaction_type: item.transaction_type, amount: item.amount, category: item.category ?? "",
      description: item.description ?? "", transaction_date: item.transaction_date,
      transfer_group_id: item.transfer_group_id ?? "", transfer_direction: item.transfer_direction ?? "",
    }));
    if (csvRows.length) downloadFile("budgetnest-transactions-" + localDateStamp() + ".csv", makeCsv(csvRows), "text/csv;charset=utf-8");
    setNotice("Your full JSON backup and Excel-compatible transaction CSV have been downloaded."); setExporting(false);
  }

  async function importTransactions(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !supabase || !userId) return;
    setImporting(true); setError(""); setNotice(""); setImportSummary("");
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
      const { data: accountsData, error: accountError } = await supabase.from("accounts").select("id,name,currency,is_archived").eq("user_id", userId);
      if (accountError) throw new Error(accountError.message);
      const accounts = (accountsData ?? []) as (Account & { is_archived: boolean })[];
      const existingResult = await supabase.from("transactions").select("account_id,transaction_type,amount,category,description,transaction_date").eq("user_id", userId);
      if (existingResult.error) throw new Error(existingResult.error.message);
      const seen = new Set((existingResult.data ?? []).map(row => fingerprint({ ...row, amount: Number(row.amount) })));
      const rowsToInsert: Record<string, unknown>[] = [];
      let skipped = 0;
      for (let i = 1; i < parsed.length; i++) {
        const row = parsed[i];
        const accountName = column(row, "account_name");
        const currency = column(row, "currency").toUpperCase();
        const account = accounts.find(a => a.name.toLowerCase() === accountName.toLowerCase() && a.currency === currency && !a.is_archived);
        const type = column(row, "transaction_type").toLowerCase();
        const amount = Number(column(row, "amount"));
        const date = column(row, "transaction_date");
        const category = column(row, "category");
        const description = column(row, "description");
        if (!account) throw new Error("Row " + (i + 1) + ": active account not found for " + accountName + " (" + currency + "). Create or restore the account first.");
        if (!["income","expense"].includes(type)) throw new Error("Row " + (i + 1) + ": only income and expense rows can be imported. Transfers must be recreated in BudgetNest.");
        if (!Number.isFinite(amount) || amount <= 0) throw new Error("Row " + (i + 1) + ": amount must be greater than zero.");
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date + "T00:00:00"))) throw new Error("Row " + (i + 1) + ": use YYYY-MM-DD for transaction_date.");
        if (!category) throw new Error("Row " + (i + 1) + ": category is required.");
        const value = { account_id: account.id, transaction_type: type, amount, category, description: description || null, transaction_date: date };
        const key = fingerprint({ ...value, category, description: description || null });
        if (seen.has(key)) { skipped++; continue; }
        seen.add(key);
        rowsToInsert.push({ ...value, user_id: userId, transfer_group_id: null, transfer_direction: null });
      }
      for (let i = 0; i < rowsToInsert.length; i += 100) {
        const result = await supabase.from("transactions").insert(rowsToInsert.slice(i, i + 100));
        if (result.error) throw new Error("Import stopped after " + i + " rows: " + result.error.message);
      }
      await supabase.from("activity_logs").insert({ user_id: userId, action: "data.transactions_imported", entity_type: "transaction", details: { imported: rowsToInsert.length, skipped_duplicates: skipped, source_file: file.name } });
      setImportSummary("Imported " + rowsToInsert.length + " transaction(s); skipped " + skipped + " duplicate(s).");
      setNotice("Transaction import completed."); 
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The file could not be imported.");
    } finally { setImporting(false); }
  }

  const dirty = profile.full_name !== initialProfile.full_name || profile.default_currency !== initialProfile.default_currency;
  return (
    <Stack spacing={3}>
      <Box><Typography variant="h4" fontWeight={800} letterSpacing={-0.8}>Settings</Typography><Typography color="text.secondary" sx={{ mt: 0.7 }}>Manage your profile, preferences, and personal data.</Typography></Box>
      {error && <Alert severity="error" onClose={() => setError("")}>{error}</Alert>}
      {notice && <Alert severity="success" onClose={() => setNotice("")}>{notice}</Alert>}
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
              <Alert severity="info">The backup is a JSON file containing your profile and financial records. The accompanying transaction CSV can be opened and edited in Microsoft Excel or Google Sheets. Import currently accepts income and expense CSV rows; transfers should be recreated in the app to preserve both sides.</Alert>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                <Button variant="contained" startIcon={exporting ? <CircularProgress size={17} color="inherit" /> : <CloudDownloadOutlined />} onClick={() => void exportBackup()} disabled={exporting || importing}>{exporting ? "Preparing backup…" : "Export my data"}</Button>
                <Button variant="outlined" component="label" startIcon={importing ? <CircularProgress size={17} /> : <CloudUploadOutlined />} disabled={importing || exporting}>{importing ? "Importing…" : "Import transactions CSV"}<input ref={fileRef} hidden type="file" accept=".csv,text/csv" onChange={importTransactions} /></Button>
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
    </Stack>
  );
}
