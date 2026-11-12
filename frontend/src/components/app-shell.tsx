"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { User } from "@supabase/supabase-js";
import { createClient as createSupabaseClient } from "@/lib/supabase/client";
import { usePathname } from "next/navigation";
import { AuthModal } from "@/components/auth-modal";
import { apiRequest } from "@/lib/api";
import { buildNotifications } from "@/lib/notifications";
import type { AppNotification } from "@/lib/notifications";
import {
  AccountBalanceWalletOutlined, AssessmentOutlined, AutorenewOutlined,
  DashboardOutlined, DarkModeOutlined, HistoryRounded, InfoOutlined, KeyboardArrowDown, LightModeOutlined,
  MenuRounded, NotificationsNoneOutlined, SavingsOutlined, SettingsOutlined,
  SwapHorizOutlined, TrendingUpOutlined, AccountCircleOutlined, CloseRounded, PolicyOutlined
} from "@mui/icons-material";
import {
  AppBar, Avatar, Badge, Box, Button, CircularProgress, Divider, Drawer, IconButton, List,
  ListItemButton, ListItemIcon, ListItemText, Menu, MenuItem, Stack, Toolbar,
  Popover, Tooltip, Typography, Dialog, DialogContent, useMediaQuery, useTheme
} from "@mui/material";
import { useThemeMode } from "@/components/theme-provider";

const drawerWidth = 252;
const navGroups = [
  { label: "OVERVIEW", items: [{ label: "Dashboard", href: "/", icon: <DashboardOutlined /> }] },
  { label: "MONEY", items: [
    { label: "Accounts", href: "/accounts", icon: <AccountBalanceWalletOutlined /> },
    { label: "Transactions", href: "/transactions", icon: <SwapHorizOutlined /> },
    { label: "Budgets", href: "/budgets", icon: <AssessmentOutlined /> },
    { label: "Goals", href: "/goals", icon: <SavingsOutlined /> }
  ] },
  { label: "COMMITMENTS", items: [
    { label: "Loans", href: "/loans", icon: <TrendingUpOutlined /> },
    { label: "Subscriptions", href: "/subscriptions", icon: <AutorenewOutlined /> }
  ] },
  { label: "PREFERENCES", items: [
    { label: "Activity Log", href: "/activity", icon: <HistoryRounded /> },
    { label: "Settings", href: "/settings", icon: <SettingsOutlined /> },
    { label: "About", href: "/about", icon: <InfoOutlined /> },
    { label: "Privacy", href: "/privacy", icon: <PolicyOutlined /> }
  ] }
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [notificationAnchor, setNotificationAnchor] = useState<HTMLElement | null>(null);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);

  useEffect(() => {
    if (!authReady || user) return;
    const dismissed = window.sessionStorage.getItem("budgetnest-welcome-dismissed");
    if (!dismissed) setWelcomeOpen(true);
  }, [authReady, user]);

  useEffect(() => {
    const supabase = createSupabaseClient();
    if (!supabase) {
      setAuthReady(true);
      return;
    }
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setAuthReady(true);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setAuthReady(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  async function handleSignOut() {
    const supabase = createSupabaseClient();
    if (!supabase || isSigningOut) return;

    setAccountMenu(null);
    setIsSigningOut(true);
    await new Promise((resolve) => window.setTimeout(resolve, 450));

    const { error } = await supabase.auth.signOut();
    setIsSigningOut(false);
    if (error) {
      console.error("Unable to sign out:", error);
      return;
    }

    setWelcomeMode("signed-out");
    setWelcomeOpen(true);
    router.replace("/");
    router.refresh();
  }

  useEffect(() => {
    if (!authReady) return;
    let active = true;
    setDismissedIds([]);

    const loadNotifications = () => {
      setNotificationsLoading(true);
      Promise.all([
        apiRequest<{ accounts: Array<{ id: string; currency?: string }>; budgets: Array<any>; expenses: Array<any> }>("/budgets"),
        apiRequest<{ accounts: Array<{ id: string; currency?: string }>; goals: Array<any> }>("/goals"),
        apiRequest<{ subscriptions: Array<any> }>("/subscriptions"),
      ]).then(([budgetData, goalData, subscriptionData]) => {
        if (!active) return;
        setNotifications(buildNotifications({
          accounts: budgetData.accounts?.length ? budgetData.accounts : goalData.accounts ?? [],
          budgets: budgetData.budgets ?? [],
          expenses: budgetData.expenses ?? [],
          goals: goalData.goals ?? [],
          subscriptions: subscriptionData.subscriptions ?? [],
        }));
      }).catch((error) => {
        console.error("Unable to load notifications:", error);
        if (active) setNotifications([]);
      }).finally(() => {
        if (active) setNotificationsLoading(false);
      });
    };

    loadNotifications();
    window.addEventListener("budgetnest:data-changed", loadNotifications);
    return () => {
      active = false;
      window.removeEventListener("budgetnest:data-changed", loadNotifications);
    };
  }, [authReady, user?.id]);

  const visibleNotifications = notifications.filter(item => !dismissedIds.includes(item.id));
  const dismissNotification = (id: string) => setDismissedIds(current => [...current, id]);
  const dismissAllNotifications = () => setDismissedIds(current => [
    ...current,
    ...visibleNotifications.map(item => item.id),
  ]);

  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up("lg"));
  const { mode, toggleMode } = useThemeMode();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [accountMenu, setAccountMenu] = useState<HTMLElement | null>(null);
  const [loginOpen, setLoginOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [welcomeOpen, setWelcomeOpen] = useState(false);
  const [welcomeMode, setWelcomeMode] = useState<"first-visit" | "signed-out">("first-visit");
  const pageTitle = useMemo(
    () => navGroups.flatMap((group) => group.items).find((item) => item.href === pathname)?.label ?? "BudgetNest",
    [pathname]
  );

  if (pathname === "/login" || pathname === "/register") return <>{children}</>;

  const sidebar = (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%", bgcolor: "background.paper" }}>
      <Stack direction="row" alignItems="center" spacing={1.5} sx={{ px: 2.5, height: 76 }}>
        <Box sx={{ width: 38, height: 38, borderRadius: 2.5, display: "grid", placeItems: "center", bgcolor: "primary.main", color: "primary.contrastText", fontWeight: 900, fontSize: 20 }}>B</Box>
        <Box>
          <Typography fontWeight={850} letterSpacing={-0.5} lineHeight={1.1}>BudgetNest</Typography>
          <Typography variant="caption" color="text.secondary">PERSONAL FINANCE</Typography>
        </Box>
        {!isDesktop && <Box sx={{ flexGrow: 1 }} />}
        {!isDesktop && <IconButton onClick={() => setMobileOpen(false)} aria-label="Close navigation"><CloseRounded /></IconButton>}
      </Stack>
      <Divider />
      <Box sx={{ px: 1.5, py: 2, flexGrow: 1, overflowY: "auto" }}>
        {navGroups.map((group) => (
          <Box key={group.label} sx={{ mb: 2.2 }}>
            <Typography sx={{ px: 1.5, mb: 0.8, fontSize: 10, fontWeight: 800, letterSpacing: 1.2, color: "text.disabled" }}>{group.label}</Typography>
            <List disablePadding>
              {group.items.map((item) => {
                const selected = pathname === item.href;
                return (
                  <ListItemButton
                    key={item.href}
                    component={Link}
                    href={item.href}
                    selected={selected}
                    onClick={() => setMobileOpen(false)}
                    sx={{
                      minHeight: 44, px: 1.5, mb: 0.35, borderRadius: 2.5,
                      color: selected ? "primary.main" : "text.secondary",
                      "&.Mui-selected": { bgcolor: "action.selected", color: "primary.main" },
                      "&.Mui-selected:hover": { bgcolor: "action.selected" },
                      "&:hover": { bgcolor: "action.hover" }
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 36, color: "inherit" }}>{item.icon}</ListItemIcon>
                    <ListItemText primary={item.label} primaryTypographyProps={{ fontSize: 13.5, fontWeight: selected ? 750 : 550 }} />
                    {selected && <Box sx={{ width: 5, height: 5, borderRadius: "50%", bgcolor: "primary.main" }} />}
                  </ListItemButton>
                );
              })}
            </List>
          </Box>
        ))}
      </Box>
      <Box sx={{ p: 2 }}>
        <Box sx={{ p: 1.7, borderRadius: 3, bgcolor: "action.hover" }}>
          <Typography variant="caption" fontWeight={750}>A little progress adds up.</Typography>
          <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 0.5, lineHeight: 1.5 }}>
            Build a clearer picture of your money, one entry at a time.
          </Typography>
        </Box>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default", scrollbarGutter: "stable" }}>
      <Box component="nav" sx={{ width: { lg: drawerWidth }, flexShrink: { lg: 0 } }}>
        <Drawer variant="temporary" open={mobileOpen} onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{ display: { xs: "block", lg: "none" }, "& .MuiDrawer-paper": { width: drawerWidth, border: 0 } }}>
          {sidebar}
        </Drawer>
        <Drawer variant="permanent" open
          sx={{ display: { xs: "none", lg: "block" }, "& .MuiDrawer-paper": { width: drawerWidth, boxSizing: "border-box", borderRight: 1, borderColor: "divider" } }}>
          {sidebar}
        </Drawer>
      </Box>

      <Box sx={{ ml: { lg: `${drawerWidth}px` }, minHeight: "100vh", display: "flex", flexDirection: "column" }}>
        <AppBar position="sticky" color="inherit" elevation={0} sx={{ borderBottom: 1, borderColor: "divider", bgcolor: "background.default" }}>
          <Toolbar sx={{ minHeight: "72px !important", px: { xs: 2, md: 3 } }}>
            <IconButton onClick={() => setMobileOpen(true)} sx={{ display: { lg: "none" }, mr: 1 }} aria-label="Open navigation"><MenuRounded /></IconButton>
            <Box sx={{ flexGrow: 1 }}>
              <Typography fontWeight={800} sx={{ fontSize: { xs: 16, sm: 17 }, lineHeight: 1.25 }}>{pageTitle}</Typography>
            </Box>
            <Tooltip title={mode === "dark" ? "Switch to light mode" : "Switch to dark mode"}>
              <IconButton onClick={toggleMode} aria-label="Toggle color theme" sx={{ mr: 0.5 }}>
                {mode === "dark" ? <LightModeOutlined /> : <DarkModeOutlined />}
              </IconButton>
            </Tooltip>
            <Tooltip title="Notifications">
              <IconButton onClick={(event) => setNotificationAnchor(event.currentTarget)} aria-label="Notifications" sx={{ mr: 1 }}>
                <Badge badgeContent={visibleNotifications.length} color="error" max={9}>
                  <NotificationsNoneOutlined />
                </Badge>
              </IconButton>
            </Tooltip>
            <Button onClick={(event) => setAccountMenu(event.currentTarget)} color="inherit" sx={{ minWidth: 0, px: 1, textTransform: "none", borderRadius: 3 }}>
              <Avatar sx={{ width: 32, height: 32, bgcolor: "primary.main", fontSize: 13, mr: 1 }}>{user?.email?.[0]?.toUpperCase() ?? "G"}</Avatar>
              <Box sx={{ display: { xs: "none", sm: "block" }, textAlign: "left", mr: 0.5 }}>
                <Typography variant="body2" fontWeight={700} lineHeight={1.2}>{user?.user_metadata?.full_name ?? (user?.email ? user.email.split("@")[0] : "Guest")}</Typography>
                <Typography variant="caption" color="text.secondary">{user?.email ?? (authReady ? "Not signed in" : "Checking session…")}</Typography>
              </Box>
              <KeyboardArrowDown fontSize="small" />
            </Button>
            <Menu anchorEl={accountMenu} open={Boolean(accountMenu)} onClose={() => setAccountMenu(null)}>
              {user ? (
                <MenuItem onClick={handleSignOut}>Sign out</MenuItem>
              ) : (
                <MenuItem onClick={() => { setAccountMenu(null); setLoginOpen(true); }}><AccountCircleOutlined fontSize="small" sx={{ mr: 1 }} /> Sign in / Create account</MenuItem>
              )}
            </Menu>

          </Toolbar>
        </AppBar>
        <Dialog
          open={isSigningOut}
          disableEscapeKeyDown
          onClose={() => undefined}
          maxWidth="xs"
          fullWidth
          PaperProps={{ sx: { borderRadius: 4, mx: 2 } }}
        >
          <DialogContent sx={{ py: 4, px: 3 }}>
            <Stack alignItems="center" spacing={2}>
              <CircularProgress size={30} />
              <Box sx={{ textAlign: "center" }}>
                <Typography fontWeight={800}>Signing you out</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  Just a moment while we safely end your session…
                </Typography>
              </Box>
            </Stack>
          </DialogContent>
        </Dialog>
        <Dialog
          open={welcomeOpen}
          onClose={() => {
            window.sessionStorage.setItem("budgetnest-welcome-dismissed", "1");
            setWelcomeOpen(false);
          }}
          fullWidth
          maxWidth="sm"
          PaperProps={{ sx: { borderRadius: 4, overflow: "hidden", mx: { xs: 1.5, sm: 2 } } }}
        >
          <DialogContent sx={{ p: { xs: 3.5, sm: 5 } }}>
            <Stack spacing={2.2}>
              <Box>
                <Typography sx={{ color: "primary.main", fontSize: 11, fontWeight: 800, letterSpacing: 1.5, textTransform: "uppercase" }}>
                  {welcomeMode === "signed-out" ? "You’re signed out" : "Welcome to BudgetNest"}
                </Typography>
                <Typography variant="h4" fontWeight={800} letterSpacing={-0.8} sx={{ mt: 0.8, fontSize: { xs: "1.75rem", sm: "2.125rem" } }}>
                  {welcomeMode === "signed-out" ? "Thanks for stopping by." : "A calmer place for your money."}
                </Typography>
                <Typography color="text.secondary" sx={{ mt: 1, lineHeight: 1.7 }}>
                  {welcomeMode === "signed-out"
                    ? "You’ve safely signed out. You can keep exploring BudgetNest as a guest or sign in again whenever you’re ready."
                    : "Explore the app, get a feel for the dashboard, and sign in whenever you’re ready to save your own data."}
                </Typography>
              </Box>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1.2}>
                <Button
                  variant="contained"
                  fullWidth
                  onClick={() => {
                    setWelcomeOpen(false);
                    setLoginOpen(true);
                  }}
                  sx={{ borderRadius: 2.5, py: 1.15, textTransform: "none", fontWeight: 750 }}
                >
                  {welcomeMode === "signed-out" ? "Sign in again" : "Sign in / Create account"}
                </Button>
                <Button
                  variant="outlined"
                  fullWidth
                  onClick={() => {
                    window.sessionStorage.setItem("budgetnest-welcome-dismissed", "1");
                    setWelcomeOpen(false);
                  }}
                  sx={{ borderRadius: 2.5, py: 1.15, textTransform: "none", fontWeight: 700 }}
                >
                  Continue as guest
                </Button>
              </Stack>
              <Typography variant="caption" color="text.disabled" textAlign="center">
                You can close this welcome anytime and continue exploring.
              </Typography>
            </Stack>
          </DialogContent>
        </Dialog>
        <AuthModal open={loginOpen} onClose={() => setLoginOpen(false)} />
        <Popover
          open={Boolean(notificationAnchor)}
          anchorEl={notificationAnchor}
          onClose={() => setNotificationAnchor(null)}
          anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
          transformOrigin={{ vertical: "top", horizontal: "right" }}
          slotProps={{ paper: { sx: { mt: 1, width: { xs: "calc(100vw - 32px)", sm: 390 }, maxWidth: 390, borderRadius: 3, overflow: "hidden" } } }}
        >
          <Box sx={{ px: 2, py: 1.7, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <Box>
              <Typography fontWeight={800}>Notifications</Typography>
              <Typography variant="caption" color="text.secondary">
                {visibleNotifications.length ? `${visibleNotifications.length} active alert${visibleNotifications.length === 1 ? "" : "s"}` : "You're all caught up"}
              </Typography>
            </Box>
            {visibleNotifications.length > 0 && (
              <Button size="small" color="inherit" onClick={dismissAllNotifications}>Clear all</Button>
            )}
          </Box>
          <Divider />
          <Box sx={{ maxHeight: 430, overflowY: "auto" }}>
            {notificationsLoading ? (
              <Box sx={{ p: 3, textAlign: "center" }}><Typography variant="body2" color="text.secondary">Checking your budgets and goals…</Typography></Box>
            ) : visibleNotifications.length === 0 ? (
              <Box sx={{ px: 3, py: 4, textAlign: "center" }}>
                <Box sx={{ width: 42, height: 42, borderRadius: "50%", bgcolor: "action.hover", display: "grid", placeItems: "center", mx: "auto", mb: 1.2 }}>
                  <NotificationsNoneOutlined color="action" />
                </Box>
                <Typography fontWeight={700} variant="body2">You're all caught up!</Typography>
                <Typography variant="caption" color="text.secondary">We'll let you know when something needs your attention.</Typography>
              </Box>
            ) : visibleNotifications.map((item) => (
              <Box key={item.id} sx={{ display: "flex", alignItems: "flex-start", gap: 1, px: 1.5, py: 1.4, borderBottom: 1, borderColor: "divider", "&:hover": { bgcolor: "action.hover" } }}>
                <Box
                  component="button"
                  onClick={() => { dismissNotification(item.id); setNotificationAnchor(null); router.push(item.href); }}
                  sx={{ flex: 1, minWidth: 0, border: 0, p: 0, bgcolor: "transparent", color: "inherit", textAlign: "left", cursor: "pointer" }}
                >
                  <Stack direction="row" alignItems="center" spacing={0.8} sx={{ mb: 0.45 }}>
                    <Box sx={{ width: 7, height: 7, flexShrink: 0, borderRadius: "50%", bgcolor: item.severity === "error" ? "error.main" : item.severity === "warning" ? "warning.main" : item.severity === "success" ? "success.main" : "info.main" }} />
                    <Typography variant="body2" fontWeight={750}>{item.title}</Typography>
                  </Stack>
                  <Typography variant="caption" color="text.secondary" sx={{ display: "block", lineHeight: 1.5, pl: 1.7 }}>{item.message}</Typography>
                  <Typography variant="caption" color="primary.main" fontWeight={700} sx={{ display: "block", pl: 1.7, mt: 0.7 }}>View details</Typography>
                </Box>
                <Tooltip title="Dismiss for now">
                  <IconButton size="small" aria-label={`Dismiss ${item.title}`} onClick={() => dismissNotification(item.id)} sx={{ mt: -0.5 }}>
                    <CloseRounded fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
            ))}
          </Box>
          <Box sx={{ px: 2, py: 1, bgcolor: "action.hover" }}>
            <Typography variant="caption" color="text.secondary">Dismissed alerts may appear again when you sign in if they still need attention.</Typography>
          </Box>
        </Popover>
        <Box
          key={`${pathname}:${user?.id ?? "guest"}`}
          component="main"
          className="page-transition"
          sx={{ width: "100%", maxWidth: 1600, mx: "auto", px: { xs: 2, sm: 3, xl: 4 }, py: { xs: 3, md: 4 }, flexGrow: 1 }}
        >
          {children}
        </Box>
        <Box component="footer" sx={{ px: 3, py: 2, borderTop: 1, borderColor: "divider" }}>
          <Typography variant="caption" color="text.disabled">BudgetNest · Your money, with a little more clarity.</Typography>
        </Box>
      </Box>
    </Box>
  );
}
