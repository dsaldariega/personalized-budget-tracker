"use client";

import { useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import {
  AccountBalanceWalletOutlined, AssessmentOutlined, AutorenewOutlined, ChevronLeft,
  DashboardOutlined, DarkModeOutlined, InfoOutlined, KeyboardArrowDown, LightModeOutlined,
  MenuRounded, NotificationsNoneOutlined, SavingsOutlined, SettingsOutlined,
  SwapHorizOutlined, TrendingUpOutlined, AccountCircleOutlined, CloseRounded
} from "@mui/icons-material";
import {
  AppBar, Avatar, Badge, Box, Button, Chip, Divider, Drawer, IconButton, List,
  ListItemButton, ListItemIcon, ListItemText, Menu, MenuItem, Stack, Toolbar,
  Tooltip, Typography, useMediaQuery, useTheme
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
    { label: "Activity Log", href: "/activity", icon: <SwapHorizOutlined /> },
    { label: "Settings", href: "/settings", icon: <SettingsOutlined /> },
    { label: "About", href: "/about", icon: <InfoOutlined /> }
  ] }
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up("lg"), { noSsr: true });
  const { mode, toggleMode } = useThemeMode();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [accountMenu, setAccountMenu] = useState<HTMLElement | null>(null);
  const [noticeOpen, setNoticeOpen] = useState(false);
  const pageTitle = useMemo(
    () => navGroups.flatMap((group) => group.items).find((item) => item.href === pathname)?.label ?? "BudgetNest",
    [pathname]
  );

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
                    component="a"
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
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
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
              <Typography variant="caption" color="text.secondary">WORKSPACE / {pageTitle.toUpperCase()}</Typography>
              <Typography fontWeight={750} sx={{ lineHeight: 1.25 }}>{pageTitle}</Typography>
            </Box>
            <Tooltip title={mode === "dark" ? "Switch to light mode" : "Switch to dark mode"}>
              <IconButton onClick={toggleMode} aria-label="Toggle color theme" sx={{ mr: 0.5 }}>
                {mode === "dark" ? <LightModeOutlined /> : <DarkModeOutlined />}
              </IconButton>
            </Tooltip>
            <Tooltip title="Notifications">
              <IconButton onClick={() => setNoticeOpen(true)} aria-label="Notifications" sx={{ mr: 1 }}>
                <Badge variant="dot" color="primary"><NotificationsNoneOutlined /></Badge>
              </IconButton>
            </Tooltip>
            <Button onClick={(event) => setAccountMenu(event.currentTarget)} color="inherit" sx={{ minWidth: 0, px: 1, textTransform: "none", borderRadius: 3 }}>
              <Avatar sx={{ width: 32, height: 32, bgcolor: "primary.main", fontSize: 13, mr: 1 }}>G</Avatar>
              <Box sx={{ display: { xs: "none", sm: "block" }, textAlign: "left", mr: 0.5 }}>
                <Typography variant="body2" fontWeight={700} lineHeight={1.2}>Guest</Typography>
                <Typography variant="caption" color="text.secondary">Local preview</Typography>
              </Box>
              <KeyboardArrowDown fontSize="small" />
            </Button>
            <Menu anchorEl={accountMenu} open={Boolean(accountMenu)} onClose={() => setAccountMenu(null)}>
              <MenuItem onClick={() => setAccountMenu(null)}><AccountCircleOutlined fontSize="small" sx={{ mr: 1 }} /> Sign in / Create account</MenuItem>
              <MenuItem onClick={() => setAccountMenu(null)} disabled>Profile settings (coming soon)</MenuItem>
            </Menu>
            <Menu anchorEl={null} open={noticeOpen} onClose={() => setNoticeOpen(false)}>
              <MenuItem onClick={() => setNoticeOpen(false)}>You’re all caught up.</MenuItem>
            </Menu>
          </Toolbar>
        </AppBar>
        <Box component="main" sx={{ width: "100%", maxWidth: 1600, mx: "auto", px: { xs: 2, sm: 3, xl: 4 }, py: { xs: 3, md: 4 }, flexGrow: 1 }}>
          {children}
        </Box>
        <Box component="footer" sx={{ px: 3, py: 2, borderTop: 1, borderColor: "divider" }}>
          <Typography variant="caption" color="text.disabled">BudgetNest · Your money, with a little more clarity.</Typography>
        </Box>
      </Box>
    </Box>
  );
}
