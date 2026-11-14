import type { Metadata } from "next";
import {
  ArrowBackRounded, BackupOutlined, CloudOutlined, LockOutlined, PersonOutlineRounded,
  SecurityOutlined, StorageRounded,
} from "@mui/icons-material";
import { Box, Button, Paper, Stack, Typography } from "@mui/material";

export const metadata: Metadata = { title: "Privacy Policy" };

const sections = [
  {
    icon: <PersonOutlineRounded />,
    title: "What information we collect",
    paragraphs: [
      "When you create an account, BudgetNest uses the information you provide for your profile and sign-in, such as your name, username, email address, and preferred currency.",
      "When you use BudgetNest, you may also enter financial information such as accounts, balances, income, expenses, budgets, savings goals, loans, repayments, subscriptions, and related activity. We use this information to provide the features you choose to use.",
      "If you use the feedback form, the subject, category, and message you enter are prepared in your own email application. BudgetNest does not send the email automatically."
    ],
  },
  {
    icon: <CloudOutlined />,
    title: "How we use your information",
    paragraphs: [
      "We use your information to provide the BudgetNest experience: show your financial overview, calculate balances and summaries, track spending and budgets, monitor savings goals, manage loans and recurring commitments, and maintain your activity history.",
      "Your information is also used to support features such as data export and supported transaction imports. We do not use your BudgetNest records to make payments or access your bank accounts.",
      "If you contact us with feedback, we use the message you choose to send to understand problems, suggestions, and opportunities to improve BudgetNest."
    ],
  },
  {
    icon: <StorageRounded />,
    title: "Where your information is stored",
    paragraphs: [
      "For signed-in users, your account and financial records are stored in the hosted services that operate BudgetNest. These services provide the application's sign-in and database infrastructure.",
      "For guests, BudgetNest can be used without creating an account. Guest information is kept only for the current browser session and is not saved to a BudgetNest account or synchronized to the cloud.",
      "We keep personal financial records separated by account so that one signed-in user cannot use the application to view another user's records."
    ],
  },
  {
    icon: <SecurityOutlined />,
    title: "How we protect your information",
    paragraphs: [
      "BudgetNest requires sign-in before personal account records can be associated with your account and synchronized with the cloud. Access to your financial records is limited to your signed-in account.",
      "We use established hosting, authentication, and database services to operate the application. These services include access controls designed to prevent unauthorized access to stored records.",
      "BudgetNest is a personal finance tracking and planning tool. It does not connect directly to your bank or e-wallet, fetch balances from financial institutions, initiate payments, or store your bank login credentials.",
      "Please keep your BudgetNest password private. Never enter bank passwords, card PINs, or other sensitive banking credentials into transaction notes, descriptions, or feedback."
    ],
  },
  {
    icon: <BackupOutlined />,
    title: "Your choices and control",
    paragraphs: [
      "You can review, update, or delete supported financial records through the relevant BudgetNest features. Signed-in users can also use Settings to export their information.",
      "The full JSON backup contains your BudgetNest records, while the transaction CSV is intended for supported income and expense data. Keep exported files somewhere safe because they may contain sensitive financial information.",
      "Guest users can explore and use the available dashboard features without signing in. Cloud synchronization and account-based backup are available only after signing in."
    ],
  },
  {
    icon: <LockOutlined />,
    title: "How long we keep your information",
    paragraphs: [
      "Signed-in records remain associated with your BudgetNest account while the account is active, subject to the operation of the application and the services that support it.",
      "BudgetNest does not currently provide a self-service account deletion feature. If you want to request account deletion, use the feedback form on the About & Help page and clearly state that you want your account removed. A request does not delete the account automatically.",
      "Before requesting deletion, export your information if you want to keep a copy. Deleting individual records in the app does not by itself remove your account."
    ],
  },
];

export default function PrivacyPage() {
  return (
    <Stack spacing={3}>
      <Box>
        <Button href="/about" startIcon={<ArrowBackRounded />} color="inherit" sx={{ mb: 1 }}>
          Back to About & Help
        </Button>
        <Typography variant="h4" fontWeight={850} letterSpacing={-0.8}>Privacy policy</Typography>
        <Typography color="text.secondary" sx={{ mt: 0.7 }}>
          A clear overview of what BudgetNest collects, how it is used, and the choices available to you.
        </Typography>
      </Box>

      <Paper variant="outlined" sx={{ p: { xs: 2.5, md: 3 }, borderRadius: 3 }}>
        <Typography variant="body2" color="text.secondary" lineHeight={1.8}>
          <strong>Last updated: November 12, 2026.</strong> This page describes the current behavior of BudgetNest in plain language. It is a product notice, not legal advice.
        </Typography>
      </Paper>

      {sections.map(section => (
        <Paper key={section.title} variant="outlined" sx={{ p: { xs: 2.5, md: 3 }, borderRadius: 3 }}>
          <Stack direction="row" spacing={1.2} alignItems="center" sx={{ mb: 1.5 }}>
            <Box sx={{ width: 40, height: 40, borderRadius: 2, display: "grid", placeItems: "center", bgcolor: "action.hover", color: "primary.main" }}>
              {section.icon}
            </Box>
            <Typography variant="h6" fontWeight={800}>{section.title}</Typography>
          </Stack>
          <Stack spacing={1.4}>
            {section.paragraphs.map(paragraph => (
              <Typography key={paragraph} variant="body2" color="text.secondary" lineHeight={1.85}>{paragraph}</Typography>
            ))}
          </Stack>
        </Paper>
      ))}

      <Paper sx={{ p: { xs: 2.5, md: 3 }, borderRadius: 3, bgcolor: "action.hover" }}>
        <Typography fontWeight={800}>Questions about privacy?</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, lineHeight: 1.8 }}>
          Use the feedback form on the About & Help page to ask a privacy-related question or request account deletion. Please do not include passwords, card PINs, or other sensitive banking credentials.
        </Typography>
        <Button href="/about" variant="outlined" sx={{ mt: 1.5 }}>Go to About & Help</Button>
      </Paper>
    </Stack>
  );
}
