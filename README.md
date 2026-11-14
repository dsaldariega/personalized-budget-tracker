# BudgetNest — Personalized Budget Tracker

BudgetNest is a personal finance web application that helps people organize their money, understand their spending, and keep track of financial goals in one place.

It brings everyday money-management tools together in a clear, responsive interface—from recording transactions and setting budgets to monitoring savings goals, loans, and recurring subscriptions.

> **Project status:** Active development. The `dev` branch is used for ongoing development and testing. The `main` branch is reserved for reviewed releases. The project is not presented as production-ready.

## About BudgetNest

Managing personal finances can become difficult when income, expenses, savings, and recurring payments are tracked in different places. BudgetNest aims to make that process easier by giving users a single workspace for their day-to-day financial activity.

The application is being developed with an emphasis on clarity, usability, and a consistent experience across desktop and mobile screens. Its interface follows familiar Material UI design patterns with a customized red-based visual theme.

## Key Features

- **Dashboard overview** — Review a summary of financial activity, account information, budget progress, and recent transactions.
- **Account management** — Organize the accounts used to track money.
- **Transaction tracking** — Record income, expenses, and transfers between accounts.
- **Budget management** — Create and monitor budgets with weekly, monthly, yearly, or custom periods.
- **Savings goals** — Set savings targets and follow progress toward each goal.
- **Loan tracking** — Keep track of loans and repayment information, including flat-rate and reducing-balance interest calculations.
- **Subscription tracking** — Organize recurring subscriptions with weekly, monthly, quarterly, or yearly schedules.
- **Activity history** — Review a history of account activity and changes.
- **Data import and export** — Export data for backup, export transaction records as CSV, and import transaction data from CSV.
- **Personal settings** — Update profile information and the default currency, and choose light or dark appearance.
- **Authentication** — Register an account and sign in using an email address or username.
- **Responsive interface** — Use the application on desktop and smaller screens.
- **Guest exploration** — Explore the application experience without creating an account, where guest access is available.

Feature availability and behavior may change while development continues.

## Application Screenshots

Screenshots will be added here as the interface and feature set are finalized. No screenshot assets are currently included in this repository.

## Technology Stack

| Area | Technologies |
| --- | --- |
| Frontend framework | Next.js, React |
| Language | TypeScript |
| UI components and styling | Material UI (MUI), Emotion |
| Backend | Node.js, Express |
| Database and authentication | Supabase, PostgreSQL |
| Deployment | Vercel |
| Version control | Git, GitHub |

## Getting Started

### Prerequisites

Install the following before setting up the project:

- **Node.js** — Version 20.9 or later is recommended.
- **npm** — Included with Node.js.
- **Git** — To clone the repository.
- **Supabase account and project** — Required for the database and authentication configuration.

Basic familiarity with JavaScript/TypeScript, React, and environment variables will be helpful.

## Installation and Setup

### 1. Clone the repository

```bash
git clone https://github.com/dsaldariega/personalized-budget-tracker.git
cd personalized-budget-tracker
```

### 2. Install dependencies

From the repository root, install dependencies for the root project, frontend, and backend:

```bash
npm run install:all
```

### 3. Configure environment variables

Create local environment files from the provided examples.

For the frontend:

- Copy `frontend/.env.example` to `frontend/.env.local`.

For the backend:

- Copy `backend/.env.example` to `backend/.env`.

Use your own Supabase project values. The following examples use placeholders only.

**Frontend — `frontend/.env.local`**

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_your_key
NEXT_PUBLIC_API_URL=http://localhost:4000/api
```

**Backend — `backend/.env`**

```env
PORT=4000
FRONTEND_URL=http://localhost:3000
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_your_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

Keep real credentials private. Never commit local environment files or expose a service-role key in frontend code, public repositories, screenshots, or client-side configuration.

### 4. Configure Supabase

Create or select a Supabase project and use its project URL and keys in the appropriate local environment files. Review the SQL migration files in `supabase/migrations/` and apply the migrations to your development database before running the application.

Do not use production credentials for local development unless you have intentionally chosen that setup and understand the implications.

### 5. Run the application locally

From the repository root:

```bash
npm run dev
```

This starts the frontend and backend development processes together.

- Frontend: [http://localhost:3000](http://localhost:3000)
- Backend: [http://localhost:4000](http://localhost:4000)

Keep the terminal running while using the application. Stop the development processes with `Ctrl + C`.

### 6. Build the project

To run the configured frontend and backend build scripts:

```bash
npm run build
```

To run the frontend lint check:

```bash
npm --prefix frontend run lint
```

## Project Structure

The repository is organized into separate frontend, backend, and database-migration areas.

```text
personalized-budget-tracker/
├── backend/
│   ├── src/
│   ├── .env.example
│   └── package.json
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── app/
│   │   ├── components/
│   │   └── lib/
│   ├── .env.example
│   └── package.json
├── supabase/
│   └── migrations/
├── package.json
└── README.md
```

- `frontend/` — Next.js application, pages, reusable interface components, and frontend utilities.
- `backend/` — Express application and server-side application modules.
- `supabase/migrations/` — SQL migration files used to evolve the database schema.
- Root `package.json` — Shared scripts for installing dependencies, running the development applications, and building the project.

## How to Use

Once the application is running:

1. Open the frontend in your browser.
2. Create an account or sign in. Guest exploration may also be available.
3. Review the dashboard to get an overview of your financial activity.
4. Add the accounts you want to use for tracking.
5. Record income, expenses, and transfers as they happen.
6. Create budgets to organize spending by period.
7. Add savings goals, loans, and recurring subscriptions when relevant.
8. Review your activity history and update personal settings as needed.
9. Use the available export and import options to keep a copy of your data or work with transaction records.

The exact screens and available options may evolve as new improvements are introduced.

## Current Development Status

BudgetNest is an actively developed personal project. Current work focuses on improving the user experience, refining responsive layouts, maintaining consistent interface patterns, and continuing to develop and verify application features.

- `dev` is the working branch for development and testing.
- `main` is intended for reviewed release changes.
- Screenshots and additional project documentation will be added as the project progresses.

A successful local build or an available deployment should not be taken as a guarantee that every feature or production concern has been fully verified.

## Disclaimer

BudgetNest is provided as a personal finance tracking project for learning, demonstration, and general organizational purposes. It is not a bank, financial institution, accounting service, or source of professional financial advice.

Always verify financial records and calculations independently. Do not rely on the application as the sole record of your finances, and do not enter sensitive information that the application does not explicitly require.

The project is under active development. Features, behavior, and availability may change without notice.

## Acknowledgements

- [Next.js](https://nextjs.org/) and [React](https://react.dev/) for the frontend foundation.
- [Material UI](https://mui.com/) for component and interface design patterns.
- [Node.js](https://nodejs.org/) and [Express](https://expressjs.com/) for the backend foundation.
- [Supabase](https://supabase.com/) for database and authentication services.
- [Vercel](https://vercel.com/) for application deployment.
