import type { Metadata } from "next";
import { cookies } from "next/headers";
import "./globals.css";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v16-appRouter";
import { AppShell } from "@/components/app-shell";
import { ThemeProvider, type ThemePreference } from "@/components/theme-provider";

export const metadata: Metadata = {
  title: {
    default: "BudgetNest",
    template: "%s | BudgetNest"
  },
  description: "A clearer, calmer way to manage your personal finances."
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const cookieStore = await cookies();
  const savedTheme = cookieStore.get("budgetnest-theme")?.value;
  const initialPreference: ThemePreference = savedTheme === "system" || savedTheme === "dark" ? savedTheme : "light";

  return (
    <html lang="en">
      <body>
        <AppRouterCacheProvider options={{ enableCssLayer: true }}>
          <ThemeProvider initialPreference={initialPreference}>
            <AppShell>{children}</AppShell>
          </ThemeProvider>
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}
