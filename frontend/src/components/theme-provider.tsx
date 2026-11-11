"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { CssBaseline, ThemeProvider as MuiThemeProvider, createTheme } from "@mui/material";

type ThemeMode = "light" | "dark";
const THEME_STORAGE_KEY = "budgetnest-theme";
const ThemeContext = createContext<{ mode: ThemeMode; toggleMode: () => void }>({
  mode: "light",
  toggleMode: () => undefined,
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Keep the server render and the first client render identical.
  // The saved preference is restored after hydration from localStorage.
  const [mode, setMode] = useState<ThemeMode>("light");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(THEME_STORAGE_KEY);
      if (saved === "light" || saved === "dark") setMode(saved);
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (hydrated) window.localStorage.setItem(THEME_STORAGE_KEY, mode);
  }, [mode, hydrated]);

  const theme = useMemo(() => createTheme({
    palette: {
      mode,
      primary: { main: mode === "dark" ? "#A78BFA" : "#6847E8", light: mode === "dark" ? "#C4B5FD" : "#927CF4", dark: mode === "dark" ? "#8063D8" : "#4E32C5", contrastText: "#FFFFFF" },
      secondary: { main: mode === "dark" ? "#38D6C1" : "#00AFA0", light: "#65E4D2", dark: "#008E83", contrastText: "#062E2A" },
      success: { main: mode === "dark" ? "#4AD6A2" : "#159B70" },
      warning: { main: mode === "dark" ? "#FFC66D" : "#E99A24" },
      error: { main: mode === "dark" ? "#FF8292" : "#E65368" },
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
    },
  }), [mode]);

  const toggleMode = () => setMode(current => current === "dark" ? "light" : "dark");

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
