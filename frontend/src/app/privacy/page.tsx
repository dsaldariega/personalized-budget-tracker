import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowBackRounded, BackupOutlined, CloudOutlined, LockOutlined, PersonOutlineRounded,
  SecurityOutlined, StorageRounded,
} from "@mui/icons-material";
import { Box, Button, Paper, Stack, Typography } from "@mui/material";

export const metadata: Metadata = { title: "Privacy Policy" };

const sections = [
  {
    icon: <PersonOutlineRounded />,
    title: "Information you provide",
    paragraphs: [
      "BudgetNest stores the profile details you provide, including your name and default currency. Your email address is handled by the sign-in service.",
      "The app also stores the financial information you enter: account names and balances, income and expense transactions, budgets, savings goals, loan details and repayments, subscriptions and payment history, and related activity records.",
      "If you use the feedback form, the feedback category and message are stored with your signed-in account."
    ],
  },
  {
    icon: <CloudOutlined />,
    title: "How information is used",
    paragraphs: [
      "Your information is used to provide BudgetNest features: calculate account balances and summaries, display budgets and progress, track loans and recurring commitments, maintain activity history, and support data export and transaction import.",
      "Feedback is collected so the app maintainer can understand reported issues and suggestions and improve the product."
    ],
  },
  {
    icon: <StorageRounded />,
    title: "Where information is stored",
    paragraphs: [
      "BudgetNest uses Supabase for authentication and its PostgreSQL database, and Vercel to host the web application and API. The BudgetNest Supabase project is configured in the Singapore region.",
      "Database access is protected with authenticated requests and Row Level Security policies that scope financial records to the signed-in account. Feedback submissions are accepted only from authenticated users and are not readable or editable through the normal user-facing database permissions."
    ],
  },
  {
    icon: <SecurityOutlined />,
    title: "Sharing and financial connections",
    paragraphs: [
      "BudgetNest does not connect directly to your bank or e-wallet, fetch balances from financial institutions, initiate payments, or store bank login credentials. You enter and maintain the information yourself.",
      "The app relies on its hosting and database providers to operate. Do not place passwords, card numbers, PINs, or other banking secrets in transaction descriptions, notes, or feedback messages."
    ],
  },
  {
    icon: <BackupOutlined />,
    title: "Your choices and data export",
    paragraphs: [
      "You can update your profile and use Settings to export a full JSON backup and an import-compatible CSV of income and expense transactions. The JSON backup also includes records that are not part of the transaction CSV, such as transfers and related financial records.",
      "You can edit or delete supported financial records in their respective modules. Theme preference is stored in your browser."
    ],
  },
  {
    icon: <LockOutlined />,
    title: "Retention and account deletion",
    paragraphs: [
      "Your records are retained while your BudgetNest account remains active, subject to the operation of the app and its infrastructure providers. Feedback submissions are retained in the app database for review and product improvement.",
      "Permanent account deletion is not currently available as a self-service feature. Export your data before making a deletion request. Deleting individual records in the app does not delete your authentication account."
    ],
  },
];

export default function PrivacyPage() {
  return (
    <Stack spacing={3}>
      <Box>
        <Button component={Link} href="/about" startIcon={<ArrowBackRounded />} color="inherit" sx={{ mb: 1 }}>
          Back to About & Help
        </Button>
        <Typography variant="h4" fontWeight={850} letterSpacing={-0.8}>Privacy policy</Typography>
        <Typography color="text.secondary" sx={{ mt: 0.7 }}>
          What BudgetNest stores, why it is used, and the controls available to you.
        </Typography>
      </Box>
      <Paper variant="outlined" sx={{ p: { xs: 2.5, md: 3 }, borderRadius: 3 }}>
        <Typography variant="body2" color="text.secondary" lineHeight={1.8}>
          <strong>Last updated: November 12, 2026.</strong> This page describes the current behavior of BudgetNest. It is intended as a plain-language product notice and is not legal advice.
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
          Use the feedback form on the About & Help page to send a privacy-related question. Do not include passwords or sensitive banking details.
        </Typography>
        <Button component={Link} href="/about" variant="outlined" sx={{ mt: 1.5 }}>Go to About & Help</Button>
      </Paper>
    </Stack>
  );
}
