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
- [ ] Total balance
- [ ] Income
- [ ] Expenses
- [ ] Cash-flow overview
- [ ] Category breakdown
- [ ] Upcoming recurring payments
- [ ] Savings progress

### Phase 5 — Budgets
- [ ] Budget creation
- [ ] Category assignment
- [ ] Account assignment
- [ ] Spending progress
- [ ] Budget alerts

### Phase 6 — Goals
- [ ] Savings goal creation
- [ ] Account assignment
- [ ] Target amount
- [ ] Progress tracking
- [ ] Goal completion

### Phase 7 — Loans
- [ ] Loan creation
- [ ] Account assignment
- [ ] Principal
- [ ] Interest
- [ ] Terms
- [ ] Payment tracking
- [ ] Remaining balance

### Phase 8 — Subscriptions
- [ ] Recurring service setup
- [ ] Billing frequency
- [ ] Account assignment
- [ ] Next billing date
- [ ] Active/inactive status

### Phase 9 — Activity & Settings
- [ ] Activity log
- [ ] Excel import
- [ ] Excel export
- [ ] Profile/settings
- [ ] Privacy controls

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

The application will retain a dark mode while also providing a polished light mode.

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
