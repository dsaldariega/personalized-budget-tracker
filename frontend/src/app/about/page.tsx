import type { Metadata } from "next";
import { FeedbackOutlined } from "@mui/icons-material";
import {
  AccountBalanceWalletOutlined, AutoAwesomeOutlined, BackupOutlined, CalendarMonthOutlined,
  CategoryOutlined, CompareArrowsRounded, HelpOutlineRounded, LockOutlined, SavingsOutlined,
  ShowChartRounded, SubscriptionsOutlined, TrendingUpRounded, WalletOutlined,
} from "@mui/icons-material";
import {
  Accordion, AccordionDetails, AccordionSummary, Box, Button, Grid, Paper, Stack, Typography,
} from "@mui/material";
import ExpandMoreRounded from "@mui/icons-material/ExpandMoreRounded";

export const metadata: Metadata = { title: "About BudgetNest" };

const features = [
  { icon: <AccountBalanceWalletOutlined />, title: "Accounts in one place", detail: "Keep track of cash, bank accounts, e-wallets, credit accounts, and investments. Each account has its own currency and running balance." },
  { icon: <CompareArrowsRounded />, title: "Clear transaction history", detail: "Record income and expenses, or move money between accounts with paired transfers that don't inflate your income or spending." },
  { icon: <CategoryOutlined />, title: "Practical budgets", detail: "Set category limits for an account and follow spending through weekly, monthly, yearly, or custom budget periods." },
  { icon: <SavingsOutlined />, title: "Savings goals", detail: "Give your savings a target, track your progress, and keep an eye on the amount still to save." },
  { icon: <TrendingUpRounded />, title: "Loan tracking", detail: "Keep loan details, estimated installments, outstanding principal, and repayment history together." },
  { icon: <SubscriptionsOutlined />, title: "Recurring commitments", detail: "Track subscriptions, billing dates, payment history, and upcoming or overdue renewals." },
  { icon: <ShowChartRounded />, title: "A useful overview", detail: "See balances, cash flow, category spending, budget progress, savings, and recent activity from your dashboard." },
  { icon: <BackupOutlined />, title: "Your data, your copy", detail: "Export a full JSON backup or an Excel-friendly CSV of income and expense transactions. Import supported transaction CSV files too." },
];

const faqs = [
  {
    question: "Do I need to create an account for every bank or e-wallet?",
    answer: "Create one BudgetNest account for each place where you keep or manage money. You can name each one yourself, choose its type and currency, and enter its starting balance. BudgetNest does not connect to or fetch balances from your bank automatically.",
  },
  {
    question: "How are account balances calculated?",
    answer: "A current balance starts with the account's opening balance, then adds income and incoming transfers and subtracts expenses and outgoing transfers. Transfers are recorded on both sides and are not counted as income or expenses.",
  },
  {
    question: "Can I use more than one currency?",
    answer: "Yes. Each account has its own currency. BudgetNest keeps totals in different currencies separate instead of adding unlike currencies together. Choose a single currency in the dashboard when you want a directly comparable view.",
  },
  {
    question: "How does budget tracking work?",
    answer: "A budget is linked to one account and one expense category. BudgetNest compares eligible expense transactions from that same account and category with the budget's current period. Transfers and transactions from other accounts are not included.",
  },
  {
    question: "Do savings goals, loan repayments, or subscription payments change my account balance?",
    answer: "Not automatically. Goals track progress separately, while loan and subscription payment records track repayments and billing history. To reflect money that actually moved in or out of an account, also record the corresponding transaction. This avoids counting the same movement twice.",
  },
  {
    question: "Can I import transactions from Excel?",
    answer: "Save your spreadsheet as CSV using the BudgetNest template, then import it from Settings. Imports support income and expense rows, require an active matching account, and skip duplicate rows. Transfers should be created in BudgetNest so both sides stay linked.",
  },
  {
    question: "How do I back up my information?",
    answer: "Open Settings and choose Export my data. BudgetNest downloads a full JSON backup of your profile and financial records. It can also provide an Excel-compatible transaction CSV for income and expense entries.",
  },
  {
    question: "Who can see my financial records?",
    answer: "BudgetNest uses Supabase authentication and Row Level Security policies to scope personal records to the signed-in user. Keep your sign-in credentials private and sign out on shared devices. Avoid entering passwords, card PINs, or other banking credentials into transaction notes.",
  },
  {
    question: "Can I permanently delete my account from the app?",
    answer: "You cannot permanently delete your BudgetNest account from the app yet. If you want to request deletion, use the feedback form on this page and tell us that you want your account removed. We will need to handle the request manually, so submitting the form does not delete the account immediately. Export a backup first if you want to keep a copy of your information.",
  },
];

export default function AboutPage() {
  return (
    <Stack spacing={4}>
      <Paper
        sx={{
          position: "relative", overflow: "hidden", p: { xs: 3, md: 5 }, borderRadius: 4,
          background: "linear-gradient(120deg, #B9233D 0%, #D93650 52%, #F16B7D 100%)",
          color: "#fff",
        }}
      >
        <Box sx={{ position: "absolute", width: 260, height: 260, borderRadius: "50%", border: "1px solid rgba(255,255,255,.18)", right: -75, top: -110 }} />
        <Box sx={{ position: "absolute", width: 190, height: 190, borderRadius: "50%", border: "1px solid rgba(255,255,255,.16)", right: 10, bottom: -130 }} />
        <Stack spacing={2} sx={{ position: "relative", maxWidth: 720 }}>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ alignSelf: "flex-start", px: 1.5, py: 0.8, borderRadius: 99, color: "#fff", bgcolor: "rgba(255,255,255,.15)", fontWeight: 700, fontSize: 13 }}><AutoAwesomeOutlined sx={{ fontSize: 18 }} /><Typography component="span" variant="body2" fontWeight={700}>A little more clarity, every day</Typography></Stack>
          <Typography variant="h3" fontWeight={850} letterSpacing={-1.5} sx={{ fontSize: { xs: 34, md: 48 }, lineHeight: 1.08 }}>
            Your money, with a little more clarity.
          </Typography>
          <Typography sx={{ color: "rgba(255,255,255,.88)", fontSize: { xs: 15, md: 17 }, lineHeight: 1.8, maxWidth: 650 }}>
            BudgetNest is a personal finance workspace designed to make everyday money decisions feel more manageable. Bring your accounts, spending, budgets, savings goals, and recurring commitments into one clear picture.
          </Typography>
        </Stack>
      </Paper>

      <Box>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
          <WalletOutlined color="primary" />
          <Typography variant="h5" fontWeight={800} letterSpacing={-0.5}>A home for your financial picture</Typography>
        </Stack>
        <Typography color="text.secondary" sx={{ maxWidth: 780, lineHeight: 1.8 }}>
          Money management is not just about recording every peso. It is about understanding where money comes from, where it goes, and what you want it to do next. BudgetNest brings those pieces together while keeping the details organized around the accounts you create.
        </Typography>
      </Box>

      <Box>
        <Typography variant="h5" fontWeight={800} letterSpacing={-0.5} sx={{ mb: 2 }}>What you can do with BudgetNest</Typography>
        <Grid container spacing={2}>
          {features.map((feature) => (
            <Grid key={feature.title} size={{ xs: 12, sm: 6, lg: 3 }}>
              <Paper variant="outlined" sx={{ height: "100%", p: 2.3, borderRadius: 3 }}>
                <Box sx={{ width: 42, height: 42, borderRadius: 2.5, display: "grid", placeItems: "center", bgcolor: "rgba(217,54,80,.10)", color: "primary.main", mb: 1.8 }}>
                  {feature.icon}
                </Box>
                <Typography fontWeight={750} sx={{ mb: 0.7 }}>{feature.title}</Typography>
                <Typography variant="body2" color="text.secondary" lineHeight={1.7}>{feature.detail}</Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>
      </Box>

      <Paper variant="outlined" sx={{ p: { xs: 2.5, md: 3 }, borderRadius: 3 }}>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
          <CalendarMonthOutlined color="primary" />
          <Typography variant="h5" fontWeight={800} letterSpacing={-0.5}>Getting started</Typography>
        </Stack>
        <Grid container spacing={2}>
          {[
            ["01", "Create your accounts", "Add the cash, bank, or e-wallet accounts you want to track. Enter each opening balance and currency."],
            ["02", "Record what happens", "Add income and expenses as they happen. Use transfers when moving money between your own accounts."],
            ["03", "Set your plans", "Create budgets for spending categories and savings goals for the things that matter to you."],
            ["04", "Review and adjust", "Visit your dashboard regularly, check upcoming commitments, and refine your plans as life changes."],
          ].map(([number, title, detail]) => (
            <Grid key={number} size={{ xs: 12, sm: 6 }}>
              <Stack direction="row" spacing={1.6} alignItems="flex-start">
                <Box sx={{ width: 38, height: 38, flexShrink: 0, borderRadius: 2, display: "grid", placeItems: "center", bgcolor: "action.hover", color: "primary.main", fontWeight: 850, fontSize: 13 }}>{number}</Box>
                <Box>
                  <Typography fontWeight={750}>{title}</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.4, lineHeight: 1.7 }}>{detail}</Typography>
                </Box>
              </Stack>
            </Grid>
          ))}
        </Grid>
      </Paper>

      <Box>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.8 }}>
          <HelpOutlineRounded color="primary" />
          <Typography variant="h5" fontWeight={800} letterSpacing={-0.5}>Frequently asked questions</Typography>
        </Stack>
        <Stack spacing={1}>
          {faqs.map((faq, index) => (
            <Accordion key={faq.question} disableGutters variant="outlined" sx={{ borderRadius: "12px !important", "&:before": { display: "none" }, overflow: "hidden" }}>
              <AccordionSummary expandIcon={<ExpandMoreRounded />} sx={{ px: 2.2, minHeight: 58, "& .MuiAccordionSummary-content": { my: 1.5 } }}>
                <Typography fontWeight={700} fontSize={14}>{faq.question}</Typography>
              </AccordionSummary>
              <AccordionDetails sx={{ px: 2.2, pt: 0, pb: 2.2 }}>
                <Typography variant="body2" color="text.secondary" lineHeight={1.8}>{faq.answer}</Typography>
              </AccordionDetails>
            </Accordion>
          ))}
        </Stack>
      </Box>

      <Paper variant="outlined" sx={{ p: { xs: 2.5, md: 3 }, borderRadius: 3 }}>
        <Stack direction={{ xs: "column", sm: "row" }} alignItems={{ xs: "flex-start", sm: "center" }} justifyContent="space-between" spacing={2}>
          <Box>
            <Typography fontWeight={800}>Help us improve BudgetNest</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>Have an idea, suggestion, or something we could do better? We’d love to hear from you.</Typography>
          </Box>
          <Button variant="contained" startIcon={<FeedbackOutlined />} onClick={() => window.dispatchEvent(new Event("budgetnest:open-feedback"))} sx={{ flexShrink: 0 }}>Send feedback</Button>
        </Stack>
      </Paper>

      <Paper variant="outlined" sx={{ p: { xs: 2.5, md: 3 }, borderRadius: 3 }}>
        <Stack direction={{ xs: "column", sm: "row" }} alignItems={{ xs: "flex-start", sm: "center" }} justifyContent="space-between" spacing={2}>
          <Box>
            <Typography fontWeight={800}>Want to know how your information is handled?</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>Read the full BudgetNest privacy policy, including the data we store and the controls available to you.</Typography>
          </Box>
          <Button href="/privacy" variant="outlined" sx={{ flexShrink: 0 }}>Read privacy policy</Button>
        </Stack>
      </Paper>

      <Paper sx={{ p: { xs: 2.5, md: 3 }, borderRadius: 3, bgcolor: "action.hover" }}>
        <Stack direction="row" spacing={1.5} alignItems="flex-start">
          <LockOutlined color="primary" sx={{ mt: 0.2 }} />
          <Box>
            <Typography fontWeight={800}>A note about your privacy</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, lineHeight: 1.8 }}>
              Your financial records are protected by authenticated access and database-level Row Level Security. BudgetNest is a tracking and planning tool, not a bank, financial adviser, or payment processor. Always review your entries and keep your account credentials secure.
            </Typography>
          </Box>
        </Stack>
      </Paper>

      <Typography variant="caption" color="text.disabled" textAlign="center">
        BudgetNest · Personal finance, made a little clearer.
      </Typography>
    </Stack>
  );
}
