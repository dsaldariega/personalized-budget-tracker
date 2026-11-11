"use client";

import { createContext, useContext, useMemo, useState } from "react";
import { CssBaseline, ThemeProvider as MuiThemeProvider, createTheme } from "@mui/material";

type ThemeMode = "light" | "dark";
const ThemeContext = createContext<{ mode: ThemeMode; toggleMode: () => void }>({
  mode: "dark",
  toggleMode: () => undefined
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>("dark");
  const theme = useMemo(() => createTheme({
    palette: {
      mode,
      primary: { main: mode === "dark" ? "#9A88FF" : "#6B55D9" },
      secondary: { main: "#26AFA6" },
      background: mode === "dark"
        ? { default: "#0C0E13", paper: "#151922" }
        : { default: "#F5F6F8", paper: "#FFFFFF" },
      divider: mode === "dark" ? "rgba(255,255,255,0.09)" : "rgba(24,32,45,0.09)",
      shape: { borderRadius: 14 }
    },
    typography: {
      fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      h4: { fontSize: "clamp(1.65rem, 3vw, 2.15rem)" },
      button: { fontWeight: 650 }
    },
    components: {
      MuiCard: { styleOverrides: { root: { border: "1px solid", borderColor: mode === "dark" ? "rgba(255,255,255,0.07)" : "rgba(24,32,45,0.07)", boxShadow: "none" } } },
      MuiPaper: { styleOverrides: { root: { backgroundImage: "none" } } },
      MuiButton: { defaultProps: { disableRipple: true } }
    }
  }), [mode]);

  return (
    <ThemeContext.Provider value={{ mode, toggleMode: () => setMode((current) => current === "dark" ? "light" : "dark") }}>
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
