# BudgetNest — Personalized Budget Tracker

BudgetNest is a personal finance web application designed to make budgeting, spending, savings, loans, and recurring subscriptions easier to understand and manage.

The goal is deliberately simple: **give users a clear picture of where their money goes and what they are planning for next.**

## Current status

🚧 **Early development**

The repository is being developed on the `dev` branch. `main` is kept as the stable branch.

## Product scope

- 🔐 Email/password authentication
- 🔵 Google sign-in
- 📊 Personal finance dashboard
- 🏦 Financial accounts
- 💸 Transactions and spending history
- 🎯 Budgets
- 💰 Savings goals
- 🧾 Loan tracking
- 🔁 Recurring subscriptions
- 📝 Activity history
- 📥 Excel import
- 📤 Excel export
- ⚙️ Personal settings
- ℹ️ Guides, FAQ, feedback, and privacy information
- 🌙 Light/dark mode
- 📱 Responsive desktop and mobile experience

## Core relationship model

An **Account** is the financial anchor for the application.

Accounts can exist independently. The following records must belong to an existing Account:

- Budget
- Goal
- Loan
- Subscription
- Transaction

One account may have many related records, while each related record belongs to exactly one account.

If the user has no Account yet, BudgetNest will prevent creation of these dependent records and guide the user to create an Account first.

This rule will be enforced at the UI/API/database layers where appropriate rather than relying only on a disabled button.

## Planned architecture

```
personalized-budget-tracker/
├── frontend/              # Next.js + React + TypeScript + MUI
├── backend/               # Node.js + Express + TypeScript
├── supabase/
│   └── migrations/        # PostgreSQL schema and RLS migrations
├── package.json           # Workspace-level development commands
└── README.md
```

### Frontend

- Next.js
- React
- TypeScript
- Material UI
- Responsive application shell
- Light/dark theme

### Backend

- Node.js
- Express
- TypeScript
- Central API layer for application data access

### Data and authentication

- Supabase PostgreSQL
- Supabase Auth
- Row Level Security (RLS)

The frontend will never contain a Supabase service-role key.

### Deployment

The intended deployment model is:

- Frontend → Vercel
- Backend → Vercel
- Database/Auth → Supabase

## Navigation

1. Dashboard
2. Accounts
3. Transactions
4. Budgets
5. Goals
6. Loans
7. Subscriptions
8. Activity Log
9. Settings
10. About

## Development roadmap

### Phase 1 — Foundation
- [x] Repository structure
- [x] Frontend starter
- [x] Backend starter
- [x] MUI theme foundation
- [x] Dark/light mode
- [x] Application sidebar and responsive mobile drawer
- [x] Top navigation, guest account menu, notifications placeholder
- [x] Dashboard and section route scaffolds
- [x] Supabase browser/server clients with cookie-based SSR sessions
- [x] Email/password registration and login UI
- [x] Google OAuth initiation and PKCE callback handling
- [x] Session refresh and protected routes via Next.js Proxy
- [x] Authenticated user menu and sign out
- [x] Create dedicated BudgetNest Supabase project (Singapore region)
- [x] Apply initial PostgreSQL schema and owner-scoped RLS policies
- [ ] Configure Google OAuth credentials and redirect URLs
- [ ] Verify end-to-end auth with live credentials

### Phase 2 — Accounts
- [x] Create/edit/archive account
- [x] Currency support
- [x] Starting/current balance
- [x] Account overview

### Phase 3 — Transactions
- [x] Income transactions
- [x] Expense transactions
- [x] Paired account-to-account transfers (same currency)
- [x] Income and expense categories
- [x] Transaction history with search and filters
- [x] Live account balance calculations

### Phase 4 — Dashboard
- [ ] Live total balances calculated from opening balances and transactions
- [ ] Income and expense summaries with selectable reporting periods
- [ ] Six-month cash-flow comparison
- [ ] Spending breakdown by category
- [ ] Current-cycle budget progress and over-budget indicators
- [ ] Upcoming and overdue recurring subscription payments
- [ ] Savings goal progress
- [ ] Recent transaction history
- [ ] Currency-aware summaries that never combine unlike currencies

The dashboard implementation is committed to `dev`; manual acceptance testing is pending.

### Phase 5 — Budgets
- [x] Create, edit, and delete budgets
- [x] Assign expense categories
- [x] Link each budget to one account
- [x] Weekly, monthly, yearly, and custom date periods
- [x] Calculate spending from matching expense transactions
- [x] Show remaining amount and over-budget status
- [x] Search and filter budgets by account and period

### Phase 6 — Goals
- [x] Create, edit, and delete savings goals
- [x] Link each goal to one account
- [x] Set target amount, current saved amount, and optional target date
- [x] Track progress with percentage and remaining amount
- [x] Pause, resume, and complete goals
- [x] Search and filter goals by account and status

### Phase 7 — Loans
- [x] Create, edit, and delete loans linked to one account
- [x] Record principal, annual interest rate, term, start date, and due date
- [x] Estimate equal monthly installments
- [x] Record repayments with principal and interest breakdown
- [x] Calculate outstanding principal and repayment progress
- [x] View and delete payment history; update loan status

### Phase 8 — Subscriptions
- [x] Create, edit, and delete recurring services linked to one account
- [x] Weekly, monthly, quarterly, and yearly billing frequencies
- [x] Set and manage the next billing date
- [x] Categorize subscriptions and add optional notes
- [x] Pause and resume subscriptions
- [x] Estimate monthly recurring cost by currency
- [x] Highlight upcoming and overdue billing dates
- [x] Record payments and maintain billing history
- [x] Advance the next billing date after a recorded payment

### Phase 9 — Activity & Settings
- [x] Searchable activity timeline with type and date filters
- [x] Profile name and default currency settings
- [x] Persist light/dark appearance preference in the browser
- [x] Export full account data as a JSON backup
- [x] Export transactions as Excel-compatible CSV
- [x] Import income and expense transactions from CSV with validation and duplicate detection
- [x] Privacy and data ownership information
- [ ] Secure server-side account deletion workflow

### Phase 10 — Production hardening
- [ ] Validation
- [ ] Error handling
- [ ] Loading/empty states
- [ ] Accessibility
- [ ] Mobile polish
- [ ] Security review
- [ ] Production deployment

## Local development

### Requirements

- Node.js
- npm
- Supabase project for authentication/database features

### Install

From the repository root:

```bash
npm install
npm run install:all
```

### Environment

Copy the example environment files:

```text
frontend/.env.example → frontend/.env.local
backend/.env.example  → backend/.env
```

Fill in the required Supabase values when authentication/database work is enabled.



### Supabase authentication setup

BudgetNest must use its **own Supabase project**. Do not reuse the DLMSF project or its credentials.

1. Use the dedicated `budgetnest-supabase` project (project ref: `tsroovpuqjaopyzhxuop`, region: Singapore).
2. The project URL is `https://tsroovpuqjaopyzhxuop.supabase.co`. Its publishable key was provided in the setup conversation; retrieve it from Supabase **Project Settings → API Keys** if needed.
3. Add the project URL and publishable key to `frontend/.env.local`:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_your_key
```

4. In Supabase **Authentication → URL Configuration**, set the Site URL to your local app during development (`http://localhost:3000`) and add these Redirect URLs:
   - `http://localhost:3000/auth/callback`
   - Your deployed BudgetNest origin followed by `/auth/callback` when a deployment exists.
5. Under **Authentication → Providers**, enable Google when Google OAuth credentials are ready. Add the Google Client ID and Client Secret, and configure the Supabase callback URL shown on that provider page in Google Cloud.
6. Restart the frontend after changing environment variables.

The initial database migration is `supabase/migrations/20261111000000_initial_budgetnest_schema.sql`. It creates profiles, accounts, transactions, budgets, savings goals, loans, subscriptions, and activity logs with owner-scoped RLS. Account-linked records use composite foreign keys to ensure the referenced account belongs to the same user. The migration has been applied to the dedicated project.

The transaction workflow records income and expenses against one account. Transfers are stored as two matching transaction rows (outflow and inflow) sharing a transfer group ID, so both account balances update without treating the transfer as income or spending. Transfers currently require the source and destination accounts to use the same currency. The transfer-direction and transfer-group constraints are added by `20261111000002_add_transaction_transfer_direction.sql` and `20261111000003_enforce_transfer_direction_value.sql`.

Budgets are linked to one account and an expense category. Spending is calculated from expense transactions that match both the selected account and category within the current budget period. Weekly, monthly, and yearly budgets repeat from their configured start date; custom budgets use an explicit start and end date. Editing or deleting a transaction automatically changes the calculated budget progress the next time the page data is refreshed. The existing `budgets` table and its owner-scoped RLS policy are used; no additional database migration is required for the budget manager.

Loans are linked to one account and store the original principal, annual interest rate, term, start date, optional due date, notes, and status. Repayments are stored separately in the owner-scoped `loan_payments` table with an explicit principal/interest breakdown; outstanding principal is calculated from recorded principal repayments. The monthly installment is an estimate using a fixed-rate amortization formula and is not a lender-generated payment schedule. Loan repayments do not automatically create account transactions or change account balances.

Subscriptions are linked to one account and store the service name, recurring amount, billing frequency (weekly, monthly, quarterly, or yearly), next billing date, category, notes, and active/inactive status. The page estimates monthly recurring costs, highlights due-soon and overdue services, and lets users record payments with a billing date, paid date, amount, and optional notes. Recording a payment advances the next billing date by one frequency interval. Payment history is stored separately in the owner-scoped `subscription_payments` table; it does not create a transaction or change the linked account balance. Deleting a subscription also deletes its payment history.

The Activity Log reads the owner-scoped `activity_logs` table and provides a searchable timeline with activity-type and date filters. Settings allow users to update their profile name and default currency, and store the selected light/dark theme in browser-local storage. The data export downloads a complete JSON backup of the user's BudgetNest tables plus an Excel-compatible CSV of transactions. CSV import currently supports income and expense transactions; the importer validates account name/currency, dates, amounts, and categories, skips exact duplicates, and intentionally excludes transfers so paired transfer records cannot become unbalanced. Account deletion is not offered as a client-side action; it requires a trusted server-side workflow to remove the Supabase Auth identity and related data safely.

Savings goals are linked to one account and track a target amount, current saved amount, optional target date, and active/paused/completed status. Progress is maintained as a goal value and does not automatically create transactions or change the linked account balance. The existing `savings_goals` table and owner-scoped RLS policy are used; no additional database migration is required.



Theme preference is persisted in a server-readable `budgetnest-theme` cookie (with the existing localStorage preference migrated for returning users). The root layout reads the cookie before rendering so the selected light or dark theme is used on the initial page paint and remains consistent across route navigation and refreshes. The primary accent uses a red/rose palette, complemented by teal, green, orange, and blue semantic colors.

The dashboard reads the signed-in user's accounts, transactions, budgets, savings goals, and active subscriptions directly from Supabase under the existing owner-scoped RLS policies. It calculates live account balances from opening balances plus income, expenses, and paired transfer directions; excludes transfers from income/expense totals and cash-flow comparisons; and provides this month, last month, last 90 days, and this year reporting periods. The six-month cash-flow chart, category spending, current budget-cycle progress, upcoming subscription dates, savings progress, and recent transactions are all derived from the saved records. Multi-currency totals remain separated by currency, and users can filter dashboard views to a single currency for comparable charts and category summaries.

The app currently supports email/password sign-up, email/password sign-in, Google OAuth initiation, PKCE callback exchange, session refresh, protected application routes, and sign out. If email confirmation is enabled in Supabase, new users must confirm their email before their first sign-in.

The frontend uses `@supabase/ssr` with cookie-based sessions. Only the publishable key belongs in the frontend environment. Never add a Supabase secret/service-role key to a `NEXT_PUBLIC_` variable or commit real credentials.

### Run

```bash
npm run dev
```

Expected services:

- Frontend: http://localhost:3000
- Backend: http://localhost:4000
- API health check: http://localhost:4000/api/health

## Git workflow

Development happens on `dev`.

```
main
  │
  └── dev
       ├── feature/accounts
       ├── feature/transactions
       ├── feature/budgets
       └── feature/dashboard
```

Work should be tested on `dev` before changes are promoted to `main`.

## Product design principles

BudgetNest should feel like a useful personal finance application, not an automatically generated dashboard template.

The UI should prioritize:

- clear information hierarchy
- useful empty states
- meaningful feedback
- sensible defaults
- responsive layouts
- accessible controls
- restrained use of cards and decoration
- consistent terminology
- fast everyday workflows

The application opens in light mode by default, offers a vibrant multi-accent palette (violet, teal, coral, amber, and blue), and retains an optional dark mode. The selected appearance is stored in browser-local storage and shared by the root-level theme provider so it remains consistent while navigating between pages.

## Security principles

- Never expose service-role credentials in the browser.
- Use Supabase RLS for user-owned data.
- Validate ownership on API requests.
- Do not use client-controlled metadata for authorization.
- Keep secrets in environment variables.
- Validate imported spreadsheet data before inserting it.
- Log meaningful application activity without storing unnecessary sensitive information.

## Project philosophy

BudgetNest is being built incrementally: establish the foundation, verify it works, then add one financial workflow at a time.

The implementation is AI-assisted, but the product decisions, UX, architecture, and code are intentionally reviewed as a real maintainable software project.

---

**Project:** BudgetNest  
**Repository:** dsaldariega/personalized-budget-tracker  
**Status:** Early development
