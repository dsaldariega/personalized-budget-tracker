"use client";

import { AuthModal } from "@/components/auth-modal";
import {
  ChangeEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  BackupOutlined,
  CheckCircleOutlineRounded,
  CloudDownloadOutlined,
  CloudUploadOutlined,
  LockOutlined,
  PaletteOutlined,
  PersonOutlineRounded,
  ComputerOutlined,
  DarkModeOutlined,
  LightModeOutlined,
} from "@mui/icons-material";
import {
  Alert,
  Avatar,
  Box,
  Button,
  CircularProgress,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  InputAdornment,
  ListItemText,
  ToggleButtonGroup,
  ToggleButton,
} from "@mui/material";
import { createClient } from "@/lib/supabase/client";
import { apiRequest } from "@/lib/api";
import { SuccessToast } from "@/components/success-toast";
import { useThemeMode } from "@/components/theme-provider";

type Profile = { full_name: string; default_currency: string };
type ProfileResponse = {
  full_name: string | null;
  default_currency: string | null;
};
type Account = {
  id: string;
  name: string;
  currency: string;
  account_type: string;
  opening_balance: number;
  is_archived: boolean;
  created_at: string;
};
type Transaction = {
  id: string;
  account_id: string;
  transaction_type: string;
  amount: number;
  category: string | null;
  description: string | null;
  transaction_date: string;
  transfer_group_id: string | null;
  transfer_direction: string | null;
  created_at: string;
};
function currencySymbol(code: string) {
  try {
    return (
      new Intl.NumberFormat("en", {
        style: "currency",
        currency: code,
        currencyDisplay: "narrowSymbol",
      })
        .formatToParts(0)
        .find((part) => part.type === "currency")?.value ?? code
    );
  } catch {
    return code;
  }
}
const currencies = [
  { code: "PHP", name: "Philippine Peso" },
  { code: "USD", name: "US Dollar" },
  { code: "EUR", name: "Euro" },
  { code: "GBP", name: "British Pound" },
  { code: "JPY", name: "Japanese Yen" },
  { code: "SGD", name: "Singapore Dollar" },
  { code: "AUD", name: "Australian Dollar" },
  { code: "CAD", name: "Canadian Dollar" },
  { code: "NZD", name: "New Zealand Dollar" },
  { code: "AED", name: "UAE Dirham" },
  { code: "INR", name: "Indian Rupee" },
];
function csvEscape(value: unknown) {
  const text =
    value === null || value === undefined
      ? ""
      : typeof value === "object"
        ? JSON.stringify(value)
        : String(value);
  return /[",\r\n]/.test(text) ? '"' + text.replace(/"/g, '""') + '"' : text;
}
const transactionCsvHeaders = [
  "account_name",
  "currency",
  "transaction_type",
  "amount",
  "category",
  "description",
  "transaction_date",
];
function makeCsv(
  rows: Record<string, unknown>[],
  headers: string[] = transactionCsvHeaders,
) {
  return (
    "\uFEFF" +
    [
      headers.map(csvEscape).join(","),
      ...rows.map((row) =>
        headers.map((header) => csvEscape(row[header])).join(","),
      ),
    ].join("\r\n")
  );
}
function downloadFile(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
function parseCsv(text: string) {
  const rows: string[][] = [];
  let row: string[] = [],
    field = "",
    quoted = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (char === '"') quoted = false;
      else field += char;
    } else if (char === '"') quoted = true;
    else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field.replace(/\r$/, ""));
      rows.push(row);
      row = [];
      field = "";
    } else field += char;
  }
  if (field.length || row.length) {
    row.push(field.replace(/\r$/, ""));
    rows.push(row);
  }
  return rows.filter((values) => values.some((value) => value.trim() !== ""));
}
type ImportIssue = { row?: number; field?: string; message: string };
type ExportPeriod = "all" | "today" | "week" | "month" | "year" | "custom";
function normalizeImportDate(value: string): {
  value?: string;
  error?: string;
} {
  const input = value.trim();
  const valid = (year: number, month: number, day: number) => {
    const date = new Date(Date.UTC(year, month - 1, day));
    return date.getUTCFullYear() === year &&
      date.getUTCMonth() === month - 1 &&
      date.getUTCDate() === day
      ? date.toISOString().slice(0, 10)
      : undefined;
  };
  let match = input.match(/^([0-9]{4})[-/]([0-9]{1,2})[-/]([0-9]{1,2})$/);
  if (match) {
    const result = valid(Number(match[1]), Number(match[2]), Number(match[3]));
    return result
      ? { value: result }
      : { error: "Enter a real calendar date." };
  }
  match = input.match(/^([0-9]{1,2})[/-]([0-9]{1,2})[/-]([0-9]{4})$/);
  if (match) {
    const first = Number(match[1]),
      second = Number(match[2]),
      year = Number(match[3]);
    // For ambiguous slash/dash dates, use MM/DD/YYYY. If the first value
    // cannot be a month, treat the input as DD/MM/YYYY instead.
    const month = first > 12 ? second : first;
    const day = first > 12 ? first : second;
    const result = valid(year, month, day);
    return result
      ? { value: result }
      : { error: "Enter a real date (MM/DD/YYYY or YYYY-MM-DD)." };
  }
  if (/^[0-9]+(?:\.[0-9]+)?$/.test(input)) {
    const serial = Number(input);
    if (serial >= 20000 && serial <= 80000) {
      const date = new Date(
        Date.UTC(1899, 11, 30) + Math.round(serial) * 86400000,
      );
      return { value: date.toISOString().slice(0, 10) };
    }
  }
  return { error: "Use YYYY-MM-DD or MM/DD/YYYY for the transaction date." };
}
function localDateStamp() {
  const now = new Date();
  return [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("");
}
export function SettingsManager() {
  const supabase = useMemo(() => createClient(), []);
  const { mode, preference, setPreference } = useThemeMode();
  const fileRef = useRef<HTMLInputElement>(null);
  const profileController = useRef<AbortController | null>(null);
  const [email, setEmail] = useState("");
  const [profile, setProfile] = useState<Profile>({
    full_name: "",
    default_currency: "PHP",
  });
  const [initialProfile, setInitialProfile] = useState<Profile>({
    full_name: "",
    default_currency: "PHP",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [exportTransactions, setExportTransactions] = useState<Transaction[]>(
    [],
  );
  const [exportAccounts, setExportAccounts] = useState<Account[]>([]);
  const [exportPeriod, setExportPeriod] = useState<ExportPeriod>("all");
  const [exportStartDate, setExportStartDate] = useState(() =>
    new Date().toLocaleDateString("en-CA"),
  );
  const [exportEndDate, setExportEndDate] = useState(() =>
    new Date().toLocaleDateString("en-CA"),
  );
  const [exportType, setExportType] = useState<"both" | "income" | "expense">(
    "both",
  );
  const [exportCategory, setExportCategory] = useState("all");
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
    profileController.current?.abort();
    const controller = new AbortController();
    profileController.current = controller;
    const { signal } = controller;
    if (!supabase) {
      setRequiresLogin(true);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (signal.aborted) return;
    if (authError || !user) {
      setRequiresLogin(true);
      setLoading(false);
      return;
    }
    setRequiresLogin(false);
    setUserId(user.id);
    setEmail(user.email ?? "");
    try {
      const result = await apiRequest<{ profile: ProfileResponse }>(
        "/settings/profile",
        { signal },
      );
      if (signal.aborted) return;
      const value = {
        full_name:
          result.profile.full_name ?? user.user_metadata?.full_name ?? "",
        default_currency: result.profile.default_currency ?? "PHP",
      };
      setProfile(value);
      setInitialProfile(value);
    } catch (cause) {
      if (!signal.aborted)
        setError(
          cause instanceof Error
            ? cause.message
            : "Unable to load profile settings.",
        );
    } finally {
      if (!signal.aborted) setLoading(false);
    }
  }, [supabase]);
  useEffect(() => {
    void loadProfile();
    return () => profileController.current?.abort();
  }, [loadProfile]);

  async function saveProfile() {
    if (!supabase || !userId) return;
    const name = profile.full_name?.trim() ?? "";
    if (!name) {
      setError("Please enter your name.");
      return;
    }
    if (!/^[A-Z]{3}$/.test(profile.default_currency)) {
      setError("Choose a valid three-letter currency code.");
      return;
    }
    setSaving(true);
    setError("");
    setNotice("");
    try {
      await apiRequest("/settings/profile", {
        method: "PUT",
        body: JSON.stringify({
          full_name: name,
          default_currency: profile.default_currency,
        }),
      });
      const authUpdate = await supabase.auth.updateUser({
        data: { full_name: name },
      });
      if (authUpdate.error)
        throw new Error(
          "Profile saved, but the sign-in profile name could not be synchronized: " +
            authUpdate.error.message,
        );
      setInitialProfile(profile);
      setNotice("Profile settings saved.");
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to save profile settings.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function openExportDialog() {
    if (!supabase || !userId) return;
    setExporting(true);
    setError("");
    setNotice("");
    try {
      const response = await apiRequest<{
        backup: { data: Record<string, unknown> };
      }>("/settings/backup");
      const data = response.backup.data;
      setExportTransactions((data.transactions ?? []) as Transaction[]);
      setExportAccounts((data.accounts ?? []) as Account[]);
      setExportDialogOpen(true);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to prepare your transaction export.",
      );
    } finally {
      setExporting(false);
    }
  }

  function exportCsv() {
    const accountById = new Map(
      exportAccounts.map((account) => [account.id, account]),
    );
    const rows = filteredExportTransactions.map((item) => ({
      account_name: accountById.get(item.account_id)?.name ?? "",
      currency: accountById.get(item.account_id)?.currency ?? "",
      transaction_type: item.transaction_type,
      amount: Number(item.amount).toFixed(2),
      category: item.category ?? "",
      description: item.description ?? "",
      transaction_date: item.transaction_date.slice(0, 10),
    }));
    downloadFile(
      "budgetnest-transactions-" + localDateStamp() + ".csv",
      makeCsv(rows),
      "text/csv;charset=utf-8",
    );
    setExportDialogOpen(false);
    setNotice("Your filtered transaction CSV has been downloaded.");
  }
  async function importTransactions(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !supabase || !userId) return;
    setImporting(true);
    setError("");
    setNotice("");
    setImportSummary("");
    setImportIssues([]);
    setImportErrorOpen(false);
    try {
      if (file.size > 5 * 1024 * 1024)
        throw new Error("Please choose a CSV file smaller than 5 MB.");
      const raw = (await file.text()).replace(/^\uFEFF/, "");
      const parsed = parseCsv(raw);
      if (parsed.length < 2)
        throw new Error("The file does not contain any transaction rows.");
      const headers = parsed[0].map((value) => value.trim().toLowerCase());
      const required = [
        "account_name",
        "currency",
        "transaction_type",
        "amount",
        "category",
        "description",
        "transaction_date",
      ];
      const missing = required.filter((header) => !headers.includes(header));
      if (missing.length)
        throw new Error("Missing required CSV columns: " + missing.join(", "));
      if (parsed.length > 5001)
        throw new Error("Import is limited to 5,000 rows at a time.");
      const column = (row: string[], name: string) =>
        row[headers.indexOf(name)]?.trim() ?? "";
      const localIssues: ImportIssue[] = [];
      const rows = parsed.slice(1).map((row, index) => {
        const sourceDate = column(row, "transaction_date");
        const normalizedDate = normalizeImportDate(sourceDate);
        if (!normalizedDate.value)
          localIssues.push({
            row: index + 2,
            field: "transaction_date",
            message: normalizedDate.error ?? "Invalid date.",
          });
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
        setError(
          "Please correct the transaction dates listed below and try again.",
        );
        setImportIssues(localIssues);
        setImportErrorOpen(true);
        return;
      }
      const result = await apiRequest<{
        imported: number;
        skipped_duplicates: number;
      }>("/settings/transactions/import", {
        method: "POST",
        body: JSON.stringify({ rows, source_file: file.name }),
      });
      setImportSummary(
        "Imported " +
          result.imported +
          " transaction(s); skipped " +
          result.skipped_duplicates +
          " duplicate(s).",
      );
      setNotice("Transaction import completed.");
    } catch (cause) {
      const failure = cause as Error & { issues?: ImportIssue[] };
      setImportIssues(Array.isArray(failure.issues) ? failure.issues : []);
      setError(failure.message || "The file could not be imported.");
      setImportErrorOpen(true);
    } finally {
      setImporting(false);
    }
  }

  const dirty =
    profile.full_name !== initialProfile.full_name ||
    profile.default_currency !== initialProfile.default_currency;
  const exportDateRange = useMemo(() => {
    const now = new Date();
    const today = [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, "0"),
      String(now.getDate()).padStart(2, "0"),
    ].join("-");
    if (exportPeriod === "today") return { start: today, end: today };
    if (exportPeriod === "week") {
      const monday = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() - ((now.getDay() + 6) % 7),
      );
      const sunday = new Date(
        monday.getFullYear(),
        monday.getMonth(),
        monday.getDate() + 6,
      );
      const stamp = (date: Date) =>
        [
          date.getFullYear(),
          String(date.getMonth() + 1).padStart(2, "0"),
          String(date.getDate()).padStart(2, "0"),
        ].join("-");
      return { start: stamp(monday), end: stamp(sunday) };
    }
    if (exportPeriod === "month")
      return { start: today.slice(0, 7) + "-01", end: today };
    if (exportPeriod === "year")
      return { start: today.slice(0, 4) + "-01-01", end: today };
    if (exportPeriod === "custom")
      return { start: exportStartDate, end: exportEndDate };
    return { start: "", end: "" };
  }, [exportPeriod, exportStartDate, exportEndDate]);
  const filteredExportTransactions = useMemo(
    () =>
      exportTransactions.filter((item) => {
        const date = item.transaction_date.slice(0, 10);
        return (
          (item.transaction_type === "income" ||
            item.transaction_type === "expense") &&
          (exportType === "both" || item.transaction_type === exportType) &&
          (exportCategory === "all" ||
            (item.category ?? "Uncategorised") === exportCategory) &&
          (!exportDateRange.start || date >= exportDateRange.start) &&
          (!exportDateRange.end || date <= exportDateRange.end)
        );
      }),
    [exportTransactions, exportType, exportCategory, exportDateRange],
  );
  const exportDateInvalid =
    exportPeriod === "custom" &&
    (!exportStartDate || !exportEndDate || exportEndDate < exportStartDate);
  if (requiresLogin)
    return (
      <Stack spacing={3}>
        <Box>
          <Typography variant="h4" fontWeight={700} letterSpacing={-0.8}>
            Settings
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 0.7 }}>
            Manage your profile, preferences, and personal data.
          </Typography>
        </Box>
        <Paper
          variant="outlined"
          sx={{ p: { xs: 3, md: 5 }, borderRadius: 1.5, textAlign: "center" }}
        >
          <Stack
            alignItems="center"
            spacing={1.5}
            sx={{ maxWidth: 520, mx: "auto" }}
          >
            <Avatar
              sx={{
                width: 56,
                height: 56,
                bgcolor: "action.hover",
                color: "primary.main",
              }}
            >
              <LockOutlined />
            </Avatar>
            <Typography variant="h6" fontWeight={700}>
              Login required
            </Typography>
            <Typography color="text.secondary">
              Please log in to use Profile, Data backup & transfer, and account
              management features. Your guest financial data can still be used
              while you try BudgetNest, but account settings belong to your
              signed-in account.
            </Typography>
            <Button variant="contained" onClick={() => setLoginOpen(true)}>
              Log in
            </Button>
            <AuthModal open={loginOpen} onClose={() => setLoginOpen(false)} />
          </Stack>
        </Paper>
      </Stack>
    );
  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h4" fontWeight={700} letterSpacing={-0.8}>
          Settings
        </Typography>
        <Typography color="text.secondary" sx={{ mt: 0.7 }}>
          Manage your profile, preferences, and personal data.
        </Typography>
      </Box>
      {error && (
        <Alert severity="error" onClose={() => setError("")}>
          {error}
        </Alert>
      )}
      <SuccessToast message={notice} onClose={() => setNotice("")} />
      {loading ? (
        <Paper
          variant="outlined"
          sx={{
            minHeight: 180,
            display: "grid",
            placeItems: "center",
            borderRadius: 1.5,
          }}
        >
          <CircularProgress />
        </Paper>
      ) : (
        <>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                md: "repeat(2, minmax(0, 1fr))",
              },
              gap: 2,
              alignItems: "stretch",
            }}
          >
            <Paper
              variant="outlined"
              sx={{ p: { xs: 2, md: 2.5 }, borderRadius: 1.5, height: "100%" }}
            >
              <Stack
                direction="row"
                alignItems="center"
                spacing={1.2}
                sx={{ mb: 1.8 }}
              >
                <Avatar sx={{ bgcolor: "action.hover", color: "primary.main" }}>
                  <PersonOutlineRounded />
                </Avatar>
                <Box>
                  <Typography variant="h6" fontWeight={700}>
                    Profile
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Your personal details used across BudgetNest.
                  </Typography>
                </Box>
              </Stack>
              <Stack spacing={1.25}>
                <TextField
                  size="small"
                  label="Full name"
                  value={profile.full_name ?? ""}
                  onChange={(e) =>
                    setProfile((v) => ({ ...v, full_name: e.target.value }))
                  }
                  fullWidth
                  inputProps={{ maxLength: 100 }}
                />
                <TextField
                  size="small"
                  label="Email address"
                  value={email}
                  fullWidth
                  disabled
                  helperText="Email changes are managed through your authentication provider."
                />
                <TextField
                  size="small"
                  select
                  label="Default currency"
                  value={profile.default_currency}
                  onChange={(e) =>
                    setProfile((v) => ({
                      ...v,
                      default_currency: e.target.value,
                    }))
                  }
                  helperText="Used for new accounts. Existing accounts keep their saved currency."
                  fullWidth
                  sx={{
                    "& .MuiSelect-select": {
                      fontFamily: "inherit",
                      fontSize: "0.875rem",
                      fontWeight: 400,
                      color: "text.primary",
                    },
                  }}
                >
                  {currencies.map((currency) => (
                    <MenuItem
                      key={currency.code}
                      value={currency.code}
                      sx={{
                        fontFamily: "inherit",
                        fontSize: "0.875rem",
                        fontWeight: 400,
                        color: "text.primary",
                      }}
                    >
                      <Stack direction="row" alignItems="center" spacing={1.25}>
                        <Typography
                          component="span"
                          sx={{
                            minWidth: 22,
                            fontWeight: 600,
                            color: "text.secondary",
                          }}
                        >
                          {currencySymbol(currency.code)}
                        </Typography>
                        <Typography
                          component="span"
                          sx={{
                            fontSize: "inherit",
                            fontWeight: "inherit",
                            color: "inherit",
                          }}
                        >
                          {currency.name} ({currency.code})
                        </Typography>
                      </Stack>
                    </MenuItem>
                  ))}
                </TextField>
                <Box>
                  <Button
                    variant="contained"
                    onClick={() => void saveProfile()}
                    disabled={!dirty || saving}
                  >
                    {saving ? (
                      <CircularProgress size={18} color="inherit" />
                    ) : (
                      "Save profile"
                    )}
                  </Button>
                </Box>
              </Stack>
            </Paper>
            <Paper
              variant="outlined"
              sx={{ p: { xs: 2, md: 2.5 }, borderRadius: 1.5, height: "100%" }}
            >
              <Stack
                direction="row"
                alignItems="center"
                spacing={1.2}
                sx={{ mb: 1.8 }}
              >
                <Avatar sx={{ bgcolor: "action.hover", color: "primary.main" }}>
                  <PaletteOutlined />
                </Avatar>
                <Box>
                  <Typography variant="h6" fontWeight={700}>
                    Appearance
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Choose how BudgetNest looks on this device.
                  </Typography>
                </Box>
              </Stack>
              <Stack spacing={2}>
                <Box>
                  <Typography fontWeight={700}>
                    {preference === "system"
                      ? `System appearance · currently ${mode}`
                      : `${mode === "dark" ? "Dark" : "Light"} appearance enabled`}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {preference === "system"
                      ? "BudgetNest follows your device's appearance setting."
                      : "Your preference is saved in this browser and stays the same across visits."}
                  </Typography>
                </Box>
                <ToggleButtonGroup
                  exclusive
                  fullWidth
                  value={preference}
                  onChange={(_, value: "system" | "light" | "dark" | null) => {
                    if (value) setPreference(value);
                  }}
                  aria-label="Choose appearance"
                  sx={{
                    display: "grid",
                    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                    p: 0.5,
                    gap: 0.75,
                    border: 1,
                    borderColor: "divider",
                    borderRadius: 1.5,
                    bgcolor: "action.hover",
                    "& .MuiToggleButtonGroup-grouped": {
                      minWidth: 0,
                      minHeight: 104,
                      border: 1,
                      borderColor: "transparent",
                      borderRadius: "10px !important",
                      px: 0.75,
                      py: 1.25,
                      color: "text.secondary",
                      textTransform: "none",
                    },
                    "& .Mui-selected": {
                      bgcolor: "background.paper !important",
                      color: "primary.main",
                      borderColor: "primary.main",
                      boxShadow: 1,
                    },
                  }}
                >
                  <ToggleButton value="system" aria-label="System appearance">
                    <Stack alignItems="center" spacing={0.8}>
                      <ComputerOutlined fontSize="medium" />
                      <Typography variant="body2" fontWeight={700}>
                        System
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Follow device
                      </Typography>
                    </Stack>
                  </ToggleButton>
                  <ToggleButton value="light" aria-label="Light appearance">
                    <Stack alignItems="center" spacing={0.8}>
                      <LightModeOutlined fontSize="medium" />
                      <Typography variant="body2" fontWeight={700}>
                        Light
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Bright theme
                      </Typography>
                    </Stack>
                  </ToggleButton>
                  <ToggleButton value="dark" aria-label="Dark appearance">
                    <Stack alignItems="center" spacing={0.8}>
                      <DarkModeOutlined fontSize="medium" />
                      <Typography variant="body2" fontWeight={700}>
                        Dark
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Dim theme
                      </Typography>
                    </Stack>
                  </ToggleButton>
                </ToggleButtonGroup>
              </Stack>
            </Paper>
          </Box>
          <Paper
            variant="outlined"
            sx={{
              p: { xs: 2, md: 2.5 },
              borderRadius: 1.5,
              width: "100%",
              maxWidth: 920,
              mx: "auto",
            }}
          >
            <Stack
              direction="row"
              alignItems="center"
              spacing={1.2}
              sx={{ mb: 2 }}
            >
              <Avatar sx={{ bgcolor: "action.hover", color: "primary.main" }}>
                <BackupOutlined />
              </Avatar>
              <Box>
                <Typography variant="h6" fontWeight={700}>
                  Data backup & transfer
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Export selected transactions or import them from a spreadsheet.
                </Typography>
              </Box>
            </Stack>
            <Alert severity="info" sx={{ mb: 2 }}>
              Export income and expense transactions to a CSV file that opens
              in Excel or Google Sheets. Transfers are not included.
            </Alert>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))" },
                gap: 1.5,
              }}
            >
              <Paper
                variant="outlined"
                sx={{ p: 2, borderRadius: 1.5, bgcolor: "background.default" }}
              >
                <Stack spacing={1.5} alignItems="flex-start" sx={{ height: "100%" }}>
                  <CloudDownloadOutlined color="primary" fontSize="large" />
                  <Box>
                    <Typography fontWeight={700}>Export transactions</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Download your income and expense records as a filtered CSV file.
                    </Typography>
                  </Box>
                  <Box sx={{ flexGrow: 1 }} />
                  <Button
                    variant="contained"
                    fullWidth
                    startIcon={
                      exporting ? (
                        <CircularProgress size={17} color="inherit" />
                      ) : (
                        <CloudDownloadOutlined />
                      )
                    }
                    onClick={() => void openExportDialog()}
                    disabled={exporting || importing}
                  >
                    {exporting ? "Preparing export…" : "Export transactions"}
                  </Button>
                </Stack>
              </Paper>
              <Paper
                variant="outlined"
                sx={{ p: 2, borderRadius: 1.5, bgcolor: "background.default" }}
              >
                <Stack spacing={1.5} alignItems="flex-start" sx={{ height: "100%" }}>
                  <CloudUploadOutlined color="primary" fontSize="large" />
                  <Box>
                    <Typography fontWeight={700}>Import transactions</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Add transaction records from a compatible CSV spreadsheet.
                    </Typography>
                  </Box>
                  <Box sx={{ flexGrow: 1 }} />
                  <Stack spacing={1} sx={{ width: "100%" }}>
                    <Button
                      variant="outlined"
                      component="label"
                      fullWidth
                      startIcon={
                        importing ? (
                          <CircularProgress size={17} />
                        ) : (
                          <CloudUploadOutlined />
                        )
                      }
                      disabled={importing || exporting}
                    >
                      {importing ? "Importing…" : "Choose CSV file"}
                      <input
                        ref={fileRef}
                        hidden
                        type="file"
                        accept=".csv,text/csv"
                        onChange={importTransactions}
                      />
                    </Button>
                    <Button
                      color="inherit"
                      size="small"
                      onClick={() =>
                        downloadFile(
                          "budgetnest-transaction-import-template.csv",
                          "\uFEFFaccount_name,currency,transaction_type,amount,category,description,transaction_date\r\n",
                          "text/csv;charset=utf-8",
                        )
                      }
                      disabled={importing || exporting}
                    >
                      Download CSV template
                    </Button>
                  </Stack>
                </Stack>
              </Paper>
            </Box>
            {importSummary && (
              <Alert severity="success" icon={<CheckCircleOutlineRounded />} sx={{ mt: 2 }}>
                {importSummary}
              </Alert>
            )}
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 2 }}>
              Import requirements: account_name, currency, transaction_type,
              amount, category, description, transaction_date. Duplicate
              income/expense rows are skipped. Maximum file size: 5 MB / 5,000
              rows.
            </Typography>
          </Paper>
      <Dialog
        open={exportDialogOpen}
        onClose={() => !exporting && setExportDialogOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle sx={{ fontWeight: 700 }}>Export Transactions</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            <Typography variant="body2" color="text.secondary">
              Choose which income and expense transactions to include in your
              CSV file.
            </Typography>
            <TextField
              select
              size="small"
              label="Date range"
              value={exportPeriod}
              onChange={(event) =>
                setExportPeriod(event.target.value as ExportPeriod)
              }
              fullWidth
            >
              <MenuItem value="all">All Time</MenuItem>
              <MenuItem value="today">Today</MenuItem>
              <MenuItem value="week">This Week</MenuItem>
              <MenuItem value="month">This Month</MenuItem>
              <MenuItem value="year">This Year</MenuItem>
              <MenuItem value="custom">Custom Date Range</MenuItem>
            </TextField>
            {exportPeriod === "custom" && (
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                <TextField
                  size="small"
                  type="date"
                  label="Start date"
                  value={exportStartDate}
                  onChange={(event) => setExportStartDate(event.target.value)}
                  InputLabelProps={{ shrink: true }}
                  fullWidth
                />
                <TextField
                  size="small"
                  type="date"
                  label="End date"
                  value={exportEndDate}
                  onChange={(event) => setExportEndDate(event.target.value)}
                  InputLabelProps={{ shrink: true }}
                  inputProps={{ min: exportStartDate }}
                  fullWidth
                />
              </Stack>
            )}
            <TextField
              select
              size="small"
              label="Transaction type"
              value={exportType}
              onChange={(event) =>
                setExportType(
                  event.target.value as "both" | "income" | "expense",
                )
              }
              fullWidth
            >
              <MenuItem value="both">Income & Expenses</MenuItem>
              <MenuItem value="income">Income only</MenuItem>
              <MenuItem value="expense">Expenses only</MenuItem>
            </TextField>
            <TextField
              select
              size="small"
              label="Category"
              value={exportCategory}
              onChange={(event) => setExportCategory(event.target.value)}
              fullWidth
            >
              <MenuItem value="all">All categories</MenuItem>
              {Array.from(
                new Set(
                  exportTransactions
                    .filter(
                      (item) =>
                        item.transaction_type === "income" ||
                        item.transaction_type === "expense",
                    )
                    .map((item) => item.category ?? "Uncategorised"),
                ),
              )
                .sort()
                .map((category) => (
                  <MenuItem key={category} value={category}>
                    {category}
                  </MenuItem>
                ))}
            </TextField>
            {exportDateInvalid && (
              <Alert severity="warning">
                Choose a valid date range. The end date must be on or after the
                start date.
              </Alert>
            )}
            <Paper
              variant="outlined"
              sx={{ p: 2, borderRadius: 1.5, bgcolor: "action.hover" }}
            >
              <Typography variant="caption" color="text.secondary">
                Matching transactions
              </Typography>
              <Typography variant="h4" fontWeight={750}>
                {filteredExportTransactions.length}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Descriptions and notes are included when available.
              </Typography>
            </Paper>
            <Typography variant="caption" color="text.secondary">
              Only matching income and expense transactions will be exported.
              Transfers and other account data are not included.
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button
            color="inherit"
            onClick={() => setExportDialogOpen(false)}
            disabled={exporting}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={exportCsv}
            disabled={
              exporting ||
              exportDateInvalid ||
              filteredExportTransactions.length === 0
            }
          >
            <CloudDownloadOutlined sx={{ mr: 0.8 }} /> Download CSV
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog
        scroll="paper"
        open={importErrorOpen}
        onClose={() => setImportErrorOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle sx={{ fontWeight: 700 }}>
          Import couldn&apos;t be completed
        </DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            {error || "Please correct the following CSV entries and try again."}
          </Typography>
          {importIssues.length > 0 ? (
            <List dense disablePadding>
              {importIssues.map((issue, index) => (
                <ListItem
                  key={index}
                  alignItems="flex-start"
                  divider={index < importIssues.length - 1}
                  sx={{ px: 0 }}
                >
                  <ListItemText
                    primary={
                      issue.row
                        ? `CSV row ${issue.row}${issue.field ? " · " + issue.field.replaceAll("_", " ") : ""}`
                        : (issue.field ?? "Import")
                    }
                    secondary={issue.message}
                    primaryTypographyProps={{
                      fontWeight: 700,
                      variant: "body2",
                    }}
                    secondaryTypographyProps={{
                      color: "error.main",
                      variant: "body2",
                    }}
                  />
                </ListItem>
              ))}
            </List>
          ) : (
            <Typography variant="body2" color="error.main">
              {error}
            </Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button variant="contained" onClick={() => setImportErrorOpen(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
