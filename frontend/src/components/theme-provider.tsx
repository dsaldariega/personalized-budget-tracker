"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { ThemeProvider as MuiThemeProvider, createTheme } from "@mui/material/styles";

export type ThemePreference = "system" | "light" | "dark";
export type ResolvedThemeMode = "light" | "dark";

const THEME_STORAGE_KEY = "budgetnest-theme";
const THEME_COOKIE_KEY = "budgetnest-theme";

type ThemeContextValue = {
  mode: ResolvedThemeMode;
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
};

const ThemeContext = createContext<ThemeContextValue>({
  mode: "light",
  preference: "light",
  setPreference: () => undefined,
});

function isThemePreference(value: string | null | undefined): value is ThemePreference {
  return value === "system" || value === "light" || value === "dark";
}

function persistTheme(preference: ThemePreference) {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, preference);
    document.cookie = `${THEME_COOKIE_KEY}=${preference}; Path=/; Max-Age=31536000; SameSite=Lax`;
  } catch {
    // Keep the current session usable when browser storage is unavailable.
  }
}

export function ThemeProvider({
  children,
  initialPreference = "light",
}: {
  children: React.ReactNode;
  initialPreference?: ThemePreference;
}) {
  const [preference, setPreferenceState] = useState<ThemePreference>(initialPreference);
  const [systemMode, setSystemMode] = useState<ResolvedThemeMode>("light");

  useEffect(() => {
    const cookieExists = document.cookie.split("; ").some(item => item.startsWith(`${THEME_COOKIE_KEY}=`));
    if (!cookieExists) {
      const legacyPreference = window.localStorage.getItem(THEME_STORAGE_KEY);
      if (isThemePreference(legacyPreference)) {
        setPreferenceState(legacyPreference);
        persistTheme(legacyPreference);
      } else {
        persistTheme(initialPreference);
      }
    }

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const updateSystemMode = () => setSystemMode(media.matches ? "dark" : "light");
    updateSystemMode();
    media.addEventListener("change", updateSystemMode);
    return () => media.removeEventListener("change", updateSystemMode);
  }, [initialPreference]);

  const mode: ResolvedThemeMode = preference === "system" ? systemMode : preference;

  useEffect(() => {
    document.documentElement.dataset.theme = mode;
    document.documentElement.style.colorScheme = mode;
  }, [mode]);

  const setPreference = (nextPreference: ThemePreference) => {
    setPreferenceState(nextPreference);
    persistTheme(nextPreference);
  };

  const theme = useMemo(() => {
    const dark = mode === "dark";
    return createTheme({
      palette: {
        mode,
        primary: {
          main: dark ? "#EF5350" : "#D32F2F",
          light: dark ? "#FF867C" : "#EF5350",
          dark: dark ? "#B71C1C" : "#B71C1C",
          contrastText: "#FFFFFF",
        },
        secondary: {
          main: dark ? "#90A4AE" : "#455A64",
          light: "#CFD8DC",
          dark: "#263238",
          contrastText: dark ? "#121212" : "#FFFFFF",
        },
        success: { main: dark ? "#66BB6A" : "#2E7D32", light: "#81C784", dark: "#1B5E20" },
        warning: { main: dark ? "#FFB74D" : "#ED6C02", light: "#FFCC80", dark: "#E65100" },
        error: { main: dark ? "#EF5350" : "#D32F2F", light: "#E57373", dark: "#B71C1C" },
        info: { main: dark ? "#29B6F6" : "#0288D1", light: "#4FC3F7", dark: "#01579B" },
        background: dark
          ? { default: "#121212", paper: "#1E1E1E" }
          : { default: "#F7F8FA", paper: "#FFFFFF" },
        ...(dark
          ? {
              text: {
                primary: "rgba(255,255,255,0.92)",
                secondary: "rgba(255,255,255,0.68)",
                disabled: "rgba(255,255,255,0.38)",
              },
              action: {
                active: "#FFFFFF",
                hover: "rgba(255,255,255,0.07)",
                selected: "rgba(239,83,80,0.16)",
                disabled: "rgba(255,255,255,0.30)",
                disabledBackground: "rgba(255,255,255,0.12)",
                focus: "rgba(255,255,255,0.12)",
              },
            }
          : {}),
        divider: dark ? "rgba(255,255,255,0.12)" : "rgba(15,23,42,0.10)",
      },
      shape: { borderRadius: 8 },
      motion: {
        reducedMotion: "system",
      },
      typography: {
        htmlFontSize: 16,
        fontFamily: "var(--font-roboto), 'Helvetica Neue', Arial, sans-serif",
        fontSize: 15,
        h1: { fontSize: "2.125rem", lineHeight: 1.2, fontWeight: 700, letterSpacing: "-0.035em" },
        h2: { fontSize: "1.875rem", lineHeight: 1.25, fontWeight: 700, letterSpacing: "-0.03em" },
        h3: { fontSize: "1.5rem", lineHeight: 1.3, fontWeight: 700, letterSpacing: "-0.025em" },
        h4: { fontSize: "1.25rem", lineHeight: 1.35, fontWeight: 700, letterSpacing: "-0.02em" },
        h5: { fontSize: "1.125rem", lineHeight: 1.4, fontWeight: 600 },
        h6: { fontSize: "1rem", lineHeight: 1.45, fontWeight: 600 },
        subtitle1: { fontSize: "1rem", lineHeight: 1.5, fontWeight: 600 },
        subtitle2: { fontSize: "0.875rem", lineHeight: 1.45, fontWeight: 600 },
        body1: { fontSize: "0.9375rem", lineHeight: 1.6, fontWeight: 400 },
        body2: { fontSize: "0.875rem", lineHeight: 1.55, fontWeight: 400 },
        button: { fontSize: "0.875rem", lineHeight: 1.4, fontWeight: 600, textTransform: "none" },
        caption: { fontSize: "0.75rem", lineHeight: 1.45, fontWeight: 400 },
        overline: { fontSize: "0.6875rem", lineHeight: 1.5, fontWeight: 700, letterSpacing: "0.08em" },
      },
      components: {
        MuiCssBaseline: {
          styleOverrides: {
            body: { backgroundColor: dark ? "#121212" : "#F7F8FA", color: dark ? "rgba(255,255,255,0.92)" : "#1F2937" },
          },
        },
        MuiCard: {
          styleOverrides: {
            root: {
              border: "1px solid",
              borderColor: dark ? "rgba(255,255,255,0.10)" : "rgba(15,23,42,0.08)",
              borderRadius: 12,
              boxShadow: dark ? "0 2px 10px rgba(0,0,0,0.18)" : "0 2px 10px rgba(15,23,42,0.035)",
              backgroundImage: "none",
            },
          },
        },
        MuiPaper: {
          styleOverrides: {
            root: { backgroundImage: "none" },
            rounded: { borderRadius: 12 },
          },
        },
        MuiAppBar: {
          styleOverrides: {
            root: { backgroundImage: "none", boxShadow: "none" },
          },
        },
        MuiButton: {
          defaultProps: { disableRipple: true },
          styleOverrides: {
            root: { borderRadius: 8, minHeight: 38, fontWeight: 600, paddingInline: 16 },
            contained: { boxShadow: "none", "&:hover": { boxShadow: "none" } },
            outlined: { borderColor: dark ? "rgba(255,255,255,0.23)" : "rgba(15,23,42,0.20)" },
          },
        },
        MuiIconButton: { styleOverrides: { root: { borderRadius: 8 } } },
        MuiChip: {
          styleOverrides: {
            root: { borderRadius: 8, fontWeight: 600 },
            label: { fontSize: "0.75rem" },
          },
        },
        MuiMenuItem: {
          styleOverrides: {
            root: { minHeight: 40, fontFamily: "inherit", fontSize: "0.875rem", fontWeight: 500, borderRadius: 8 },
          },
        },
        MuiSelect: {
          styleOverrides: {
            select: { fontFamily: "inherit", fontSize: "0.875rem", fontWeight: 400 },
          },
        },
        MuiInputLabel: {
          styleOverrides: { root: { fontFamily: "inherit", fontSize: "0.875rem" } },
        },
        MuiOutlinedInput: {
          styleOverrides: {
            root: {
              minHeight: 46,
              borderRadius: 8,
              "&.MuiInputBase-sizeSmall": { minHeight: 38 },
              "&.MuiInputBase-multiline": { minHeight: "unset" },
              "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: dark ? "rgba(255,255,255,0.38)" : "rgba(15,23,42,0.32)" },
              "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderWidth: 2 },
            },
            input: {
              padding: "11px 13px",
              "&.MuiInputBase-inputSizeSmall": { padding: "7.5px 11px" },
              "&::placeholder": { opacity: 0.62 },
            },
            notchedOutline: { borderColor: dark ? "rgba(255,255,255,0.22)" : "rgba(15,23,42,0.20)" },
          },
        },
        MuiTableCell: {
          styleOverrides: {
            root: { padding: "12px 14px", borderColor: dark ? "rgba(255,255,255,0.10)" : "rgba(15,23,42,0.08)", fontSize: "0.875rem" },
            head: { fontWeight: 700, color: dark ? "rgba(255,255,255,0.72)" : "#475569", backgroundColor: dark ? "#242424" : "#F8FAFC" },
          },
        },
        MuiTableRow: {
          styleOverrides: { root: { "&:last-child td, &:last-child th": { borderBottom: 0 } } },
        },
        MuiDialog: {
          styleOverrides: {
            paper: { display: "flex", flexDirection: "column", maxHeight: "calc(100dvh - 32px)", overflow: "hidden", boxSizing: "border-box", borderRadius: 12, border: "1px solid", borderColor: dark ? "rgba(255,255,255,0.10)" : "rgba(15,23,42,0.08)" },
          },
        },
        MuiDialogTitle: { styleOverrides: { root: { flexShrink: 0, padding: "20px 24px 12px", fontWeight: 700, "@media (max-width:600px)": { padding: "16px 20px 10px" } } } },
        MuiDialogContent: { styleOverrides: { root: { flex: "1 1 auto", minHeight: 0, overflowY: "auto", scrollbarGutter: "stable", padding: "8px 24px 20px", "@media (max-width:600px)": { padding: "8px 20px 16px" } } } },
        MuiDialogActions: { styleOverrides: { root: { flexShrink: 0, padding: "12px 24px 20px", gap: 8, borderTop: "1px solid", borderColor: dark ? "rgba(255,255,255,0.10)" : "rgba(15,23,42,0.08)", "@media (max-width:600px)": { padding: "12px 20px 16px" } } } },
        MuiMenu: { styleOverrides: { paper: { borderRadius: 8 } } },
        MuiAlert: { styleOverrides: { root: { borderRadius: 10, alignItems: "center" } } },
        MuiTabs: { styleOverrides: { indicator: { height: 3, borderRadius: "3px 3px 0 0" } } },
        MuiTab: { styleOverrides: { root: { minHeight: 44, textTransform: "none", fontWeight: 600 } } },
        MuiTooltip: { styleOverrides: { tooltip: { borderRadius: 7, fontSize: "0.75rem" } } },
        MuiPaginationItem: { styleOverrides: { root: { borderRadius: 8 } } },
      },
    });
  }, [mode]);

  return (
    <ThemeContext.Provider value={{ mode, preference, setPreference }}>
      <MuiThemeProvider theme={theme}>{children}</MuiThemeProvider>
    </ThemeContext.Provider>
  );
}

export function useThemeMode() {
  return useContext(ThemeContext);
}
