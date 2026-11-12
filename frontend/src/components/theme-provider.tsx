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
    // Theme still works for the current session if browser storage is unavailable.
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

  const setPreference = (nextPreference: ThemePreference) => {
    setPreferenceState(nextPreference);
    persistTheme(nextPreference);
  };

  const theme = useMemo(() => createTheme({
    palette: {
      mode,
      primary: {
        main: mode === "dark" ? "#FF8292" : "#D93650",
        light: mode === "dark" ? "#FFA6B1" : "#F16B7D",
        dark: mode === "dark" ? "#E65368" : "#B9233D",
        contrastText: "#FFFFFF",
      },
      secondary: {
        main: mode === "dark" ? "#38D6C1" : "#00AFA0",
        light: "#65E4D2",
        dark: "#008E83",
        contrastText: "#062E2A",
      },
      success: { main: mode === "dark" ? "#4AD6A2" : "#159B70" },
      warning: { main: mode === "dark" ? "#FFC66D" : "#E99A24" },
      error: { main: mode === "dark" ? "#FF8292" : "#D93650" },
      info: { main: mode === "dark" ? "#70BFFF" : "#328DD8" },
      background: mode === "dark"
        ? { default: "#121212", paper: "#121212" }
        : { default: "#F8F7FA", paper: "#FFFFFF" },
      ...(mode === "dark"
        ? {
            text: {
              primary: "#FFFFFF",
              secondary: "rgba(255,255,255,0.70)",
              disabled: "rgba(255,255,255,0.50)",
            },
            action: {
              active: "#FFFFFF",
              hover: "rgba(255,255,255,0.08)",
              selected: "rgba(255,255,255,0.16)",
              disabled: "rgba(255,255,255,0.30)",
              disabledBackground: "rgba(255,255,255,0.12)",
            },
          }
        : {}),
      divider: mode === "dark" ? "rgba(255,255,255,0.12)" : "rgba(34,42,74,0.09)",
    },
    shape: { borderRadius: 12 },
    typography: {
      htmlFontSize: 16,
      fontFamily: "var(--font-roboto), 'Helvetica Neue', Arial, sans-serif",
      fontSize: 14,
      h1: { fontSize: "2rem", lineHeight: 1.2, fontWeight: 700, letterSpacing: "-0.03em" },
      h2: { fontSize: "1.75rem", lineHeight: 1.25, fontWeight: 700, letterSpacing: "-0.025em" },
      h3: { fontSize: "1.5rem", lineHeight: 1.3, fontWeight: 700, letterSpacing: "-0.02em" },
      h4: { fontSize: "1.3rem", lineHeight: 1.35, fontWeight: 700, letterSpacing: "-0.015em" },
      h5: { fontSize: "1.15rem", lineHeight: 1.4, fontWeight: 700 },
      h6: { fontSize: "1.05rem", lineHeight: 1.45, fontWeight: 700 },
      subtitle1: { fontSize: "1rem", lineHeight: 1.5, fontWeight: 600 },
      subtitle2: { fontSize: "0.9rem", lineHeight: 1.45, fontWeight: 600 },
      body1: { fontSize: "0.95rem", lineHeight: 1.6 },
      body2: { fontSize: "0.875rem", lineHeight: 1.55 },
      button: { fontSize: "0.875rem", fontWeight: 600, textTransform: "none" },
      caption: { fontSize: "0.75rem", lineHeight: 1.45 },
      overline: { fontSize: "0.7rem", lineHeight: 1.5, fontWeight: 700, letterSpacing: "0.08em" },
    },
    components: {
      MuiCard: {
        styleOverrides: {
          root: {
            position: "relative",
            overflow: "hidden",
            border: "1px solid",
            borderColor: mode === "dark" ? "rgba(255,255,255,0.12)" : "rgba(34,42,74,0.075)",
            borderRadius: 16,
            boxShadow: mode === "dark" ? "0 8px 28px rgba(0,0,0,0.16)" : "0 6px 24px rgba(38, 45, 85, 0.045)",
            transition: "transform 180ms ease, box-shadow 180ms ease, border-color 180ms ease",
            "@media (hover: hover) and (prefers-reduced-motion: no-preference)": {
              "&:hover": {
                transform: "translateY(-2px)",
                borderColor: mode === "dark" ? "rgba(255,130,146,0.30)" : "rgba(217,54,80,0.20)",
                boxShadow: mode === "dark" ? "0 12px 32px rgba(0,0,0,0.24)" : "0 12px 30px rgba(38, 45, 85, 0.085)",
              },
            },
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: "none",
            backgroundColor: mode === "dark" ? "#1E1E1E" : undefined,
          },
          rounded: { borderRadius: 16 },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            backdropFilter: "blur(16px)",
            backgroundColor: mode === "dark" ? "rgba(18,18,18,0.92)" : "rgba(250,249,252,0.88)",
          },
        },
      },
      MuiButton: {
        defaultProps: { disableRipple: true },
        styleOverrides: {
          root: { borderRadius: 10, minHeight: 36, fontWeight: 650 },
          contained: {
            boxShadow: mode === "dark" ? "0 5px 16px rgba(217,54,80,0.18)" : "0 5px 14px rgba(217,54,80,0.16)",
            "&:hover": { boxShadow: "0 8px 20px rgba(217,54,80,0.22)" },
          },
        },
      },
      MuiIconButton: {
        styleOverrides: {
          root: { borderRadius: 10 },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: { borderRadius: 8, fontWeight: 600 },
          label: { fontSize: "0.8rem" },
        },
      },
      MuiInputLabel: {
        styleOverrides: {
          root: { lineHeight: 1.4375, "&.MuiInputLabel-sizeSmall": { lineHeight: 1.4 } },
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            minHeight: 48,
            alignItems: "center",
            "&.MuiInputBase-sizeSmall": { minHeight: 38 },
            "&.MuiInputBase-multiline": { minHeight: "unset", alignItems: "flex-start" },
          },
          input: {
            boxSizing: "content-box",
            lineHeight: "1.4375em",
            padding: "13px 14px",
            "&.MuiInputBase-inputSizeSmall": { padding: "7.5px 12px" },
            "&::placeholder": { opacity: 0.62 },
          },
          inputMultiline: {
            padding: "12px 14px",
            lineHeight: 1.5,
          },
          notchedOutline: {
            borderColor: mode === "dark" ? "rgba(255,255,255,0.23)" : "rgba(34,42,74,0.20)",
          },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          root: { padding: "12px 14px", fontSize: "0.875rem" },
          head: { fontWeight: 700, color: mode === "dark" ? "rgba(255,255,255,0.70)" : "#555B70" },
        },
      },
    },
  }), [mode]);

  return (
    <ThemeContext.Provider value={{ mode, preference, setPreference }}>
      <MuiThemeProvider theme={theme}>
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
}

export function useThemeMode() {
  return useContext(ThemeContext);
}
