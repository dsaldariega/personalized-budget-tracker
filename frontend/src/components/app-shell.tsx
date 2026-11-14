"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { User } from "@supabase/supabase-js";
import { createClient as createSupabaseClient } from "@/lib/supabase/client";
import { usePathname } from "next/navigation";
import { AuthModal } from "@/components/auth-modal";
import FeedbackForm from "@/components/feedback-form";
import { apiRequest } from "@/lib/api";
import { buildNotifications } from "@/lib/notifications";
import type { AppNotification } from "@/lib/notifications";
import {
  AccountBalanceWalletOutlined, AccountBalanceWalletRounded, AssessmentOutlined, AutorenewOutlined,
  DashboardOutlined, DarkModeOutlined, HistoryRounded, InfoOutlined, KeyboardArrowDown, LightModeOutlined, ComputerOutlined,
  MenuRounded, NotificationsNoneOutlined, SavingsOutlined, SettingsOutlined, FeedbackOutlined,
  SwapHorizOutlined, TrendingUpOutlined, AccountCircleOutlined, CloseRounded, LogoutRounded, PolicyOutlined
} from "@mui/icons-material";
import {
  AppBar, Avatar, Badge, Box, Button, CircularProgress, Divider, Drawer, Fab, IconButton, List,
  ListItemButton, ListItemIcon, ListItemText, Menu, MenuItem, Stack, Toolbar,
  Popover, Tooltip, Typography, Dialog, DialogContent, useMediaQuery, ToggleButton, ToggleButtonGroup
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
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
  const { preference, setPreference } = useThemeMode();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [accountMenu, setAccountMenu] = useState<HTMLElement | null>(null);
  const [loginOpen, setLoginOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [welcomeOpen, setWelcomeOpen] = useState(false);
  const [welcomeMode, setWelcomeMode] = useState<"first-visit" | "signed-out">("first-visit");

  useEffect(() => {
    if (!user) return;
    setLoginOpen(false);
    setWelcomeOpen(false);
  }, [user?.id]);
  useEffect(() => {
    const openFeedback = () => setFeedbackOpen(true);
    window.addEventListener("budgetnest:open-feedback", openFeedback);
    return () => window.removeEventListener("budgetnest:open-feedback", openFeedback);
  }, []);

  const profileFullName = typeof user?.user_metadata?.full_name === "string" ? user.user_metadata.full_name.trim() : "";
  const profileUsername = typeof user?.user_metadata?.username === "string" ? user.user_metadata.username.trim() : "";
  const accountFullName = profileFullName || profileUsername || user?.email?.split("@")[0] || "Guest";
  const accountFirstName = accountFullName.split(/\s+/)[0] || "Guest";

  const pageTitle = useMemo(
    () => navGroups.flatMap((group) => group.items).find((item) => item.href === pathname)?.label ?? "BudgetNest",
    [pathname]
  );

  if (pathname === "/login" || pathname === "/register") return <>{children}</>;

  const sidebar = (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%", bgcolor: "background.paper" }}>
      <Stack direction="row" alignItems="center" spacing={{ xs: 1, sm: 1.5 }} sx={{ px: { xs: 1.5, sm: 2.5 }, height: 68, minHeight: 68, maxHeight: 68, flex: "0 0 68px", boxSizing: "border-box", minWidth: 0, borderBottom: 1, borderColor: "divider" }}>
        <Box sx={{ width: { xs: 36, sm: 40 }, height: { xs: 36, sm: 40 }, flexShrink: 0, borderRadius: 1.5, display: "grid", placeItems: "center", background: "linear-gradient(145deg, #EF5350 0%, #D32F2F 58%, #B71C1C 100%)", color: "primary.contrastText", fontWeight: 700, fontSize: { xs: 18, sm: 20 }, boxShadow: "0 3px 10px rgba(211,47,47,0.16)" }}><AccountBalanceWalletRounded sx={{ fontSize: { xs: 21, sm: 23 } }} /></Box>
        <Box sx={{ minWidth: 0, flexShrink: 0 }}>
          <Typography sx={{ fontSize: { xs: 16.5, sm: 18 }, fontWeight: 700, letterSpacing: "-0.035em", lineHeight: 1.15, whiteSpace: "nowrap" }}>BudgetNest</Typography>
          <Typography sx={{ display: "block", mt: 0.2, fontSize: { xs: 9, sm: 9.5 }, fontWeight: 550, letterSpacing: "0.105em", lineHeight: 1.3, color: "text.secondary", whiteSpace: "nowrap" }}>PERSONAL FINANCE</Typography>
        </Box>
        {!isDesktop && <Box sx={{ flexGrow: 1, minWidth: 0 }} />}
        {!isDesktop && <IconButton size="small" onClick={() => setMobileOpen(false)} aria-label="Close navigation" sx={{ flexShrink: 0, width: 34, height: 34, "& .MuiSvgIcon-root": { fontSize: 20 } }}><CloseRounded /></IconButton>}
      </Stack>
      <Box sx={{ px: 1.5, py: 2, flexGrow: 1, overflowY: "auto" }}>
        {navGroups.map((group) => (
          <Box key={group.label} sx={{ mb: 2.2 }}>
            <Typography sx={{ px: 1.5, mb: 0.8, fontSize: 11, fontWeight: 600, letterSpacing: 1.1, color: "text.secondary" }}>{group.label}</Typography>
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
                      minHeight: 46, px: 1.5, mb: 0.45, borderRadius: 1, position: "relative", overflow: "hidden",
                      color: selected ? "primary.main" : "text.secondary",
                      "&.Mui-selected": { bgcolor: "action.selected", color: "primary.main", "&::before": { content: '""', position: "absolute", left: 0, top: 8, bottom: 8, width: 3, borderRadius: 1.5, bgcolor: "primary.main" } },
                      "&.Mui-selected:hover": { bgcolor: "action.selected" },
                      "&:hover": { bgcolor: "action.hover" }
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 36, color: "inherit" }}>{item.icon}</ListItemIcon>
                    <ListItemText primary={item.label} primaryTypographyProps={{ fontSize: 14.5, fontWeight: selected ? 650 : 450, lineHeight: 1.4 }} />
                    {selected && <Box sx={{ width: 5, height: 5, borderRadius: "50%", bgcolor: "primary.main" }} />}
                  </ListItemButton>
                );
              })}
            </List>
          </Box>
        ))}
      </Box>
      <Box sx={{ p: 2 }}>
        <Box sx={{ p: 1.7, borderRadius: 1.5, bgcolor: "action.hover" }}>
          <Typography variant="caption" fontWeight={600}>A little progress adds up.</Typography>
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
          sx={{ display: { xs: "block", lg: "none" }, "& .MuiDrawer-paper": { width: `min(${drawerWidth}px, calc(100vw - 40px))`, border: 0 } }}>
          {sidebar}
        </Drawer>
        <Drawer variant="permanent" open
          sx={{ display: { xs: "none", lg: "block" }, "& .MuiDrawer-paper": { width: drawerWidth, boxSizing: "border-box", borderRight: 1, borderColor: "divider" } }}>
          {sidebar}
        </Drawer>
      </Box>

      <Box sx={{ ml: { lg: `${drawerWidth}px` }, minHeight: "100vh", display: "flex", flexDirection: "column" }}>
        <AppBar position="sticky" color="inherit" elevation={0} sx={{ borderBottom: 1, borderColor: "divider", bgcolor: "background.default", backdropFilter: "blur(16px)" }}>
          <Toolbar sx={{ height: { xs: "60px", sm: "68px" }, minHeight: { xs: "60px !important", sm: "68px !important" }, px: { xs: 1.25, sm: 2, md: 3 }, gap: { xs: 0.25, sm: 0.75 } }}>
            <IconButton onClick={() => setMobileOpen(true)} sx={{ display: { lg: "none" }, mr: 1 }} aria-label="Open navigation"><MenuRounded /></IconButton>
            <Box sx={{ flexGrow: 1 }}>
              <Typography fontWeight={600} sx={{ fontSize: { xs: 14, sm: 16 }, lineHeight: 1.25 }}>{pageTitle}</Typography>
            </Box>
            <ToggleButtonGroup
              exclusive
              size="small"
              value={preference}
              onChange={(_, value: "system" | "light" | "dark" | null) => {
                if (value) setPreference(value);
              }}
              aria-label="Appearance preference"
              sx={{
                mr: { xs: 0.25, sm: 0.75 },
                p: 0.35,
                gap: 0.25,
                border: 1,
                borderColor: "divider",
                borderRadius: 1,
                bgcolor: "action.hover",
                "& .MuiToggleButtonGroup-grouped": { border: 0, borderRadius: "8px !important", mx: 0, px: { xs: 0.65, sm: 0.9 }, py: 0.55, color: "text.secondary" },
                "& .Mui-selected": { bgcolor: "background.paper !important", color: "primary.main", boxShadow: 1 },
              }}
            >
              <ToggleButton value="system" aria-label="Use system appearance" title="System"><ComputerOutlined sx={{ fontSize: 18 }} /></ToggleButton>
              <ToggleButton value="light" aria-label="Use light appearance" title="Light"><LightModeOutlined sx={{ fontSize: 18 }} /></ToggleButton>
              <ToggleButton value="dark" aria-label="Use dark appearance" title="Dark"><DarkModeOutlined sx={{ fontSize: 18 }} /></ToggleButton>
            </ToggleButtonGroup>
            <Tooltip title="Notifications">
              <IconButton onClick={(event) => setNotificationAnchor(event.currentTarget)} aria-label="Notifications" sx={{ mr: { xs: 0.25, sm: 0.75 } }}>
                <Badge badgeContent={visibleNotifications.length} color="error" max={9}>
                  <NotificationsNoneOutlined />
                </Badge>
              </IconButton>
            </Tooltip>
            <Button onClick={(event) => setAccountMenu(event.currentTarget)} color="inherit" aria-label="Open profile menu" sx={{ minWidth: 0, px: { xs: 0.75, sm: 1 }, py: 0.5, textTransform: "none", borderRadius: 1, "&:hover": { bgcolor: "action.hover" } }}>
              <Avatar sx={{ width: 32, height: 32, bgcolor: "primary.main", fontSize: 13, mr: 1 }}>{accountFullName[0]?.toUpperCase() ?? "G"}</Avatar>
              <Typography variant="body2" fontWeight={700} sx={{ maxWidth: { xs: 72, sm: 120 }, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", mr: 0.5 }}>{accountFirstName}</Typography>
              <KeyboardArrowDown fontSize="small" />
            </Button>
            <Menu
              anchorEl={accountMenu}
              open={Boolean(accountMenu)}
              onClose={() => setAccountMenu(null)}
              slotProps={{
                paper: {
                  sx: {
                    mt: 0.75,
                    minWidth: 210,
                    borderRadius: 1,
                    border: 1,
                    borderColor: "divider",
                    boxShadow: 3,
                    p: 0.25,
                  },
                },
              }}
            >
              {user ? (
                <>
                  <Box sx={{ px: 1.75, py: 1.25, maxWidth: 280 }}>
                    <Typography variant="body2" fontWeight={700} noWrap>{accountFullName}</Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.25, overflowWrap: "anywhere" }}>{user.email ?? "Email unavailable"}</Typography>
                  </Box>
                  <Divider sx={{ my: 0.5 }} />
                  <MenuItem
                    onClick={handleSignOut}
                    sx={{ gap: 1, borderRadius: 0.75, py: 0.85, px: 1.25, fontWeight: 500 }}
                  >
                    <LogoutRounded fontSize="small" sx={{ color: "text.secondary" }} />
                    Sign out
                  </MenuItem>
                </>
              ) : (
                <MenuItem
                  onClick={() => { setAccountMenu(null); setLoginOpen(true); }}
                  sx={{ gap: 1, borderRadius: 0.75, py: 0.75, px: 1, fontWeight: 500 }}
                >
                  <AccountCircleOutlined fontSize="small" sx={{ color: "text.secondary" }} />
                  Sign in / Create account
                </MenuItem>
              )}
            </Menu>

          </Toolbar>
        </AppBar>
        <Dialog scroll="paper"
          open={isSigningOut}
          disableEscapeKeyDown
          onClose={() => undefined}
          maxWidth="xs"
          fullWidth
          PaperProps={{ sx: { borderRadius: 1.5, mx: 2 } }}
        >
          <DialogContent sx={{ py: 4, px: 3 }}>
            <Stack alignItems="center" spacing={2}>
              <CircularProgress size={30} />
              <Box sx={{ textAlign: "center" }}>
                <Typography fontWeight={700}>Signing you out</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  Just a moment while we safely end your session…
                </Typography>
              </Box>
            </Stack>
          </DialogContent>
        </Dialog>
        <Dialog scroll="paper"
          open={welcomeOpen}
          onClose={() => {
            window.sessionStorage.setItem("budgetnest-welcome-dismissed", "1");
            setWelcomeOpen(false);
          }}
          fullWidth
          maxWidth="sm"
          PaperProps={{ sx: { borderRadius: 1.5, overflow: "hidden", mx: { xs: 1.5, sm: 2 } } }}
        >
          <DialogContent sx={{ p: { xs: 3.5, sm: 5 } }}>
            <Stack spacing={2.2}>
              <Box>
                <Typography sx={{ color: "primary.main", fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase" }}>
                  {welcomeMode === "signed-out" ? "You’re signed out" : "Welcome to BudgetNest"}
                </Typography>
                <Typography variant="h4" fontWeight={700} letterSpacing={-0.8} sx={{ mt: 0.8, fontSize: { xs: "1.75rem", sm: "2.125rem" } }}>
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
                  sx={{ borderRadius: 1, py: 1.15, textTransform: "none", fontWeight: 600 }}
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
                  sx={{ borderRadius: 1, py: 1.15, textTransform: "none", fontWeight: 700 }}
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
        <FeedbackForm open={feedbackOpen} isAuthenticated={Boolean(user)} onClose={() => setFeedbackOpen(false)} onRequireAuth={() => setLoginOpen(true)} />
        <Popover
          open={Boolean(notificationAnchor)}
          anchorEl={notificationAnchor}
          onClose={() => setNotificationAnchor(null)}
          anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
          transformOrigin={{ vertical: "top", horizontal: "right" }}
          slotProps={{ paper: { sx: { mt: 1, width: { xs: "calc(100vw - 32px)", sm: 390 }, maxWidth: 390, borderRadius: 1.5, overflow: "hidden" } } }}
        >
          <Box sx={{ px: 2, py: 1.7, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <Box>
              <Typography fontWeight={700}>Notifications</Typography>
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
                    <Typography variant="body2" fontWeight={600}>{item.title}</Typography>
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
        {!feedbackOpen && (
          <Fab
            color="primary"
            variant="extended"
            aria-label="Send us feedback"
            onClick={() => setFeedbackOpen(true)}
            sx={{
              position: "fixed", right: { xs: 2, sm: 3 }, bottom: { xs: 2, sm: 3 }, zIndex: (theme) => theme.zIndex.speedDial,
              minWidth: 52, width: 52, height: 52, px: 1.5, overflow: "hidden", whiteSpace: "nowrap",
              transition: "width 180ms ease, border-radius 180ms ease",
              "& .feedback-label": { maxWidth: 0, opacity: 0, overflow: "hidden", transition: "max-width 180ms ease, opacity 140ms ease" },
              "&:hover, &:focus-visible": { width: 196, justifyContent: "flex-start", "& .feedback-label": { maxWidth: 150, opacity: 1, ml: 1 } },
            }}
          >
            <FeedbackOutlined />
            <Box component="span" className="feedback-label" sx={{ fontSize: 14, fontWeight: 600 }}>Send us feedback...</Box>
          </Fab>
        )}
        <Box
          key={`${pathname}:${user?.id ?? "guest"}`}
          component="main"
          className="page-transition"
          sx={{ width: "100%", maxWidth: 1840, mx: "auto", px: { xs: 2, sm: 3, md: 3.5, lg: 4, xl: 5 }, py: { xs: 2.5, sm: 3.5, md: 4.5 }, flexGrow: 1, minWidth: 0 }}
        >
          {children}
        </Box>
        <Box component="footer" sx={{ px: { xs: 2, sm: 3 }, py: 1.5, borderTop: 1, borderColor: "divider" }}>
          <Typography variant="caption" color="text.disabled">BudgetNest · Your money, with a little more clarity.</Typography>
        </Box>
      </Box>
    </Box>
  );
}
