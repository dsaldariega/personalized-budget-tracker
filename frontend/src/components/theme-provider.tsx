"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { CssBaseline, ThemeProvider as MuiThemeProvider, createTheme } from "@mui/material";

type ThemeMode = "light" | "dark";
const THEME_STORAGE_KEY = "budgetnest-theme";
const THEME_COOKIE_KEY = "budgetnest-theme";
const ThemeContext = createContext<{ mode: ThemeMode; toggleMode: () => void }>({
  mode: "light",
  toggleMode: () => undefined,
});

function persistTheme(mode: ThemeMode) {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, mode);
    document.cookie = `${THEME_COOKIE_KEY}=${mode}; Path=/; Max-Age=31536000; SameSite=Lax`;
  } catch {
    // Theme still works for the current session if browser storage is unavailable.
  }
}

export function ThemeProvider({
  children,
  initialMode = "light",
}: {
  children: React.ReactNode;
  initialMode?: ThemeMode;
}) {
  // The server reads the same preference cookie, so the first server and client
  // renders use the saved theme instead of briefly painting the default theme.
  const [mode, setMode] = useState<ThemeMode>(initialMode);

  useEffect(() => {
    // Migrate the previous localStorage-only preference once. After this,
    // the server-readable cookie is the source used for first paint.
    const cookieExists = document.cookie.split("; ").some(item => item.startsWith(`${THEME_COOKIE_KEY}=`));
    if (!cookieExists) {
      const legacyMode = window.localStorage.getItem(THEME_STORAGE_KEY);
      if (legacyMode === "light" || legacyMode === "dark") {
        persistTheme(legacyMode);
        if (legacyMode !== initialMode) setMode(legacyMode);
        return;
      }
    }
    persistTheme(initialMode);
  }, [initialMode]);

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
        ? { default: "#111426", paper: "#1A1F35" }
        : { default: "#F7F8FC", paper: "#FFFFFF" },
      divider: mode === "dark" ? "rgba(230,235,255,0.10)" : "rgba(34,42,74,0.09)",
    },
    shape: { borderRadius: 14 },
    typography: {
      fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      h4: { fontSize: "clamp(1.65rem, 3vw, 2.15rem)" },
      button: { fontWeight: 650, textTransform: "none" },
    },
    components: {
      MuiCard: {
        styleOverrides: {
          root: {
            border: "1px solid",
            borderColor: mode === "dark" ? "rgba(230,235,255,0.08)" : "rgba(34,42,74,0.08)",
            boxShadow: "0 5px 24px rgba(38, 45, 85, 0.035)",
          },
        },
      },
      MuiPaper: { styleOverrides: { root: { backgroundImage: "none" } } },
      MuiButton: { defaultProps: { disableRipple: true } },
      MuiInputLabel: {
        styleOverrides: {
          root: { lineHeight: 1.4375, "&.MuiInputLabel-sizeSmall": { lineHeight: 1.4 } },
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            minHeight: 56,
            alignItems: "center",
            "&.MuiInputBase-sizeSmall": { minHeight: 40 },
            "&.MuiInputBase-multiline": { minHeight: "unset", alignItems: "flex-start" },
          },
          input: {
            boxSizing: "content-box",
            lineHeight: "1.4375em",
            padding: "16.5px 14px",
            "&.MuiInputBase-inputSizeSmall": { padding: "8.5px 14px" },
            "&::placeholder": { opacity: 0.62 },
          },
          inputMultiline: {
            padding: "12px 14px",
            lineHeight: 1.5,
          },
          notchedOutline: {
            borderColor: mode === "dark" ? "rgba(230,235,255,0.20)" : "rgba(34,42,74,0.20)",
          },
        },
      },
    },
  }), [mode]);

  const toggleMode = () => {
    setMode(current => {
      const nextMode = current === "dark" ? "light" : "dark";
      // Write immediately so a quick route change cannot race the persistence effect.
      persistTheme(nextMode);
      return nextMode;
    });
  };

  return (
    <ThemeContext.Provider value={{ mode, toggleMode }}>
      <MuiThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
}

export function useThemeMode() {
  return useContext(ThemeContext);
}
