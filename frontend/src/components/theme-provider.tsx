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
      primary: { main: "#7c5cff" },
      secondary: { main: "#26c6da" },
      background: mode === "dark"
        ? { default: "#0b0d12", paper: "#121620" }
        : { default: "#f6f7fb", paper: "#ffffff" },
      shape: { borderRadius: 14 }
    },
    typography: { fontFamily: "Inter, system-ui, sans-serif" }
  }), [mode]);

  return (
    <ThemeContext.Provider value={{ mode, toggleMode: () => setMode((m) => m === "dark" ? "light" : "dark") }}>
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
