"use client";

type GuestRecord = Record<string, any>;

const GUEST_USER_ID = "guest";
const state: {
  accounts: GuestRecord[];
  transactions: GuestRecord[];
  budgets: GuestRecord[];
  goals: GuestRecord[];
  subscriptions: GuestRecord[];
  subscriptionPayments: GuestRecord[];
  loans: GuestRecord[];
  loanPayments: GuestRecord[];
  activities: GuestRecord[];
} = {
  accounts: [],
  transactions: [],
  budgets: [],
  goals: [],
  subscriptions: [],
  subscriptionPayments: [],
  loans: [],
  loanPayments: [],
  activities: [],
};

function id() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function now() {
  return new Date().toISOString();
}

function body(init: RequestInit) {
  if (!init.body) return {};
  try { return JSON.parse(String(init.body)); } catch { return {}; }
}

function log(action: string, entityType: string, entityId: string, details: GuestRecord = {}) {
  state.activities.unshift({
    id: id(), user_id: GUEST_USER_ID, action, entity_type: entityType,
    entity_id: entityId, details, created_at: now(),
  });
}

function owned(list: GuestRecord[], userId = GUEST_USER_ID) {
  return list.filter(item => item.user_id === userId);
}

function accountIsAvailable(accountId: string) {
  return state.accounts.some(account => account.id === accountId && !account.is_archived);
}

function expenses() {
  return state.transactions
    .filter(t => t.transaction_type === "expense")
    .map(t => ({
      account_id: t.account_id, category: t.category, amount: Number(t.amount),
      transaction_date: t.transaction_date, transaction_type: t.transaction_type,
    }));
}

function addRecord(collection: GuestRecord[], value: GuestRecord): GuestRecord {
  const record = {
    ...value, id: value.id ?? id(), user_id: GUEST_USER_ID, created_at: value.created_at ?? now(),
  };
  collection.unshift(record);
  return record;
}

function updateRecord(collection: GuestRecord[], recordId: string, patch: GuestRecord) {
  const index = collection.findIndex(item => item.id === recordId && item.user_id === GUEST_USER_ID);
  if (index < 0) return null;
  collection[index] = { ...collection[index], ...patch };
  return collection[index];
}

function deleteRecord(collection: GuestRecord[], recordId: string) {
  const index = collection.findIndex(item => item.id === recordId && item.user_id === GUEST_USER_ID);
  if (index < 0) return false;
  collection.splice(index, 1);
  return true;
}

function response(value: unknown, status = 200) {
  return { __guest: true, status, value };
}

export async function guestApiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const method = (init.method ?? "GET").toUpperCase();
  const clean = path.replace(/^\/+/, "").split("?")[0];
  const parts = clean.split("/").filter(Boolean);
  const payload = body(init);

  if (parts[0] === "accounts") {
    if (method === "GET") return response({
      accounts: owned(state.accounts),
      transactions: owned(state.transactions),
      defaultCurrency: "PHP",
    }).value as T;
    if (method === "POST") {
      const account = addRecord(state.accounts, {
        ...payload, opening_balance: Number(payload.opening_balance ?? 0), is_archived: false,
      });
      log("account.created", "account", account.id, { name: account.name });
      return response({ account }).value as T;
    }
    if (parts[1]) {
      const accountId = parts[1];
      if (method === "PUT") {
        const account = updateRecord(state.accounts, accountId, {
          ...payload, opening_balance: Number(payload.opening_balance ?? 0),
        });
        if (!account) throw new Error("Account not found.");
        log("account.updated", "account", account.id, { name: account.name });
        return response({ account }).value as T;
      }
      if (method === "PATCH" && parts[2] === "archive") {
        const account = updateRecord(state.accounts, accountId, { is_archived: Boolean(payload.archived) });
        if (!account) throw new Error("Account not found.");
        log("account.archived", "account", account.id, { archived: account.is_archived });
        return response({ account }).value as T;
      }
      if (method === "DELETE") {
        if (!deleteRecord(state.accounts, accountId)) throw new Error("Account not found.");
        state.transactions = state.transactions.filter(t => t.account_id !== accountId && t.user_id === GUEST_USER_ID);
        state.goals = state.goals.filter(g => g.account_id !== accountId && g.user_id === GUEST_USER_ID);
        state.budgets = state.budgets.filter(b => b.account_id !== accountId && b.user_id === GUEST_USER_ID);
        state.subscriptions = state.subscriptions.filter(s => s.account_id !== accountId && s.user_id === GUEST_USER_ID);
        log("account.deleted", "account", accountId);
        return undefined as T;
      }
    }
  }

  if (parts[0] === "transactions") {
    if (method === "GET") return response({
      accounts: owned(state.accounts),
      transactions: owned(state.transactions),
    }).value as T;
    if (method === "POST" && parts[1] === "transfer") {
      const source = state.accounts.find(a => a.id === payload.account_id && a.user_id === GUEST_USER_ID);
      const destination = state.accounts.find(a => a.id === payload.destination_account_id && a.user_id === GUEST_USER_ID);
      if (!source || !destination || source.is_archived || destination.is_archived) throw new Error("Choose active accounts.");
      const group = id();
      const amount = Number(payload.amount);
      const first = addRecord(state.transactions, {
        account_id: source.id, transaction_type: "transfer", amount,
        category: null, description: payload.description || null,
        transaction_date: payload.transaction_date, transfer_group_id: group, transfer_direction: "out",
      });
      const second = addRecord(state.transactions, {
        account_id: destination.id, transaction_type: "transfer", amount,
        category: null, description: payload.description || null,
        transaction_date: payload.transaction_date, transfer_group_id: group, transfer_direction: "in",
      });
      log("transaction.transfer_created", "transaction", first.id, { transfer_group_id: group });
      return response({ transactions: [first, second] }).value as T;
    }
    if (method === "POST") {
      const transaction = addRecord(state.transactions, { ...payload, amount: Number(payload.amount) });
      log("transaction.created", "transaction", transaction.id, { amount: transaction.amount });
      return response({ transaction }).value as T;
    }
    if (parts[1]) {
      const transactionId = parts[1];
      if (method === "PUT") {
        const transaction = updateRecord(state.transactions, transactionId, { ...payload, amount: Number(payload.amount) });
        if (!transaction) throw new Error("Transaction not found.");
        log("transaction.updated", "transaction", transaction.id, { amount: transaction.amount });
        return response({ transaction }).value as T;
      }
      if (method === "DELETE") {
        const target = state.transactions.find(t => t.id === transactionId && t.user_id === GUEST_USER_ID);
        if (!target) throw new Error("Transaction not found.");
        if (target.transfer_group_id) {
          state.transactions = state.transactions.filter(t => t.transfer_group_id !== target.transfer_group_id || t.user_id !== GUEST_USER_ID);
        } else {
          deleteRecord(state.transactions, transactionId);
        }
        log("transaction.deleted", "transaction", transactionId);
        return undefined as T;
      }
    }
  }

  if (parts[0] === "goals") {
    if (method === "GET") return response({ accounts: owned(state.accounts), goals: owned(state.goals) }).value as T;
    if (method === "POST") {
      const goal = addRecord(state.goals, { ...payload, target_amount: Number(payload.target_amount), current_amount: Number(payload.current_amount ?? 0) });
      log("goal.created", "goal", goal.id, { name: goal.name });
      return response({ goal }).value as T;
    }
    if (parts[1]) {
      if (method === "PUT") {
        const goal = updateRecord(state.goals, parts[1], { ...payload, target_amount: Number(payload.target_amount), current_amount: Number(payload.current_amount) });
        if (!goal) throw new Error("Savings goal not found.");
        log("goal.updated", "goal", goal.id, { name: goal.name });
        return response({ goal }).value as T;
      }
      if (method === "PATCH" && parts[2] === "status") {
        const goal = updateRecord(state.goals, parts[1], { status: payload.status });
        if (!goal) throw new Error("Savings goal not found.");
        log("goal.status_updated", "goal", goal.id, { status: goal.status });
        return response({ goal }).value as T;
      }
      if (method === "DELETE") {
        if (!deleteRecord(state.goals, parts[1])) throw new Error("Savings goal not found.");
        log("goal.deleted", "goal", parts[1]);
        return undefined as T;
      }
    }
  }

  if (parts[0] === "budgets") {
    if (method === "GET") return response({ accounts: owned(state.accounts), budgets: owned(state.budgets), expenses: expenses() }).value as T;
    if (method === "POST") {
      const budget = addRecord(state.budgets, { ...payload, amount: Number(payload.amount) });
      log("budget.created", "budget", budget.id, { name: budget.name });
      return response({ budget }).value as T;
    }
    if (parts[1]) {
      if (method === "PUT") {
        const budget = updateRecord(state.budgets, parts[1], { ...payload, amount: Number(payload.amount) });
        if (!budget) throw new Error("Budget not found.");
        log("budget.updated", "budget", budget.id, { name: budget.name });
        return response({ budget }).value as T;
      }
      if (method === "DELETE") {
        if (!deleteRecord(state.budgets, parts[1])) throw new Error("Budget not found.");
        log("budget.deleted", "budget", parts[1]);
        return undefined as T;
      }
    }
  }

  if (parts[0] === "subscriptions") {
    if (method === "GET") return response({
      accounts: owned(state.accounts), subscriptions: owned(state.subscriptions), payments: owned(state.subscriptionPayments),
    }).value as T;
    if (method === "POST") {
      const subscription = addRecord(state.subscriptions, { ...payload, amount: Number(payload.amount) });
      log("subscription.created", "subscription", subscription.id, { name: subscription.name });
      return response({ subscription }).value as T;
    }
    if (parts[1]) {
      const subscriptionId = parts[1];
      if (method === "PUT") {
        const subscription = updateRecord(state.subscriptions, subscriptionId, { ...payload, amount: Number(payload.amount) });
        if (!subscription) throw new Error("Subscription not found.");
        log("subscription.updated", "subscription", subscription.id, { name: subscription.name });
        return response({ subscription }).value as T;
      }
      if (method === "PATCH" && parts[2] === "status") {
        const subscription = updateRecord(state.subscriptions, subscriptionId, { is_active: Boolean(payload.is_active) });
        if (!subscription) throw new Error("Subscription not found.");
        log("subscription.status_updated", "subscription", subscription.id, { is_active: subscription.is_active });
        return response({ subscription }).value as T;
      }
      if (method === "POST" && parts[2] === "payments") {
        const subscription = state.subscriptions.find(s => s.id === subscriptionId && s.user_id === GUEST_USER_ID);
        if (!subscription) throw new Error("Subscription not found.");
        const payment = addRecord(state.subscriptionPayments, {
          subscription_id: subscriptionId, amount: Number(payload.amount),
          paid_date: payload.paid_date, billing_date: subscription.next_billing_date, notes: payload.notes ?? null,
        });
        const frequency = subscription.billing_frequency;
        const date = new Date(subscription.next_billing_date + "T00:00:00.000Z");
        if (frequency === "weekly") date.setUTCDate(date.getUTCDate() + 7);
        else date.setUTCMonth(date.getUTCMonth() + (frequency === "monthly" ? 1 : frequency === "quarterly" ? 3 : 12));
        updateRecord(state.subscriptions, subscriptionId, { next_billing_date: date.toISOString().slice(0, 10) });
        log("subscription.payment_recorded", "subscription", subscriptionId, { amount: payment.amount });
        return response({ payment }).value as T;
      }
      if (method === "DELETE" && parts[2] === "payments") {
        if (!deleteRecord(state.subscriptionPayments, parts[3])) throw new Error("Payment history not found.");
        log("subscription.payment_deleted", "subscription", subscriptionId, { payment_id: parts[3] });
        return response({ message: "Payment history deleted." }).value as T;
      }
      if (method === "DELETE") {
        if (!deleteRecord(state.subscriptions, subscriptionId)) throw new Error("Subscription not found.");
        state.subscriptionPayments = state.subscriptionPayments.filter(p => p.subscription_id !== subscriptionId);
        log("subscription.deleted", "subscription", subscriptionId);
        return undefined as T;
      }
    }
  }

  if (parts[0] === "loans") {
    if (method === "GET") return response({ accounts: owned(state.accounts), loans: owned(state.loans), payments: owned(state.loanPayments) }).value as T;
    if (method === "POST") {
      const term = Number(payload.term_months);
      const start = String(payload.start_date);
      const date = new Date(start + "T00:00:00.000Z");
      date.setUTCMonth(date.getUTCMonth() + term);
      const loan = addRecord(state.loans, {
        ...payload, principal_amount: Number(payload.principal_amount),
        monthly_interest_rate: Number(payload.monthly_interest_rate),
        term_months: term, due_date: date.toISOString().slice(0, 10),
      });
      log("loan.created", "loan", loan.id, { name: loan.name });
      return response({ loan }).value as T;
    }
    if (parts[1]) {
      const loanId = parts[1];
      if (method === "PUT") {
        const term = Number(payload.term_months);
        const date = new Date(String(payload.start_date) + "T00:00:00.000Z");
        date.setUTCMonth(date.getUTCMonth() + term);
        const loan = updateRecord(state.loans, loanId, {
          ...payload, principal_amount: Number(payload.principal_amount),
          monthly_interest_rate: Number(payload.monthly_interest_rate),
          term_months: term, due_date: date.toISOString().slice(0, 10),
        });
        if (!loan) throw new Error("Loan not found.");
        log("loan.updated", "loan", loan.id, { name: loan.name });
        return response({ loan }).value as T;
      }
      if (method === "PATCH" && parts[2] === "status") {
        const loan = updateRecord(state.loans, loanId, { status: payload.status });
        if (!loan) throw new Error("Loan not found.");
        log("loan.status_updated", "loan", loan.id, { status: loan.status });
        return response({ loan }).value as T;
      }
      if (method === "POST" && parts[2] === "payments") {
        const loan = state.loans.find(l => l.id === loanId && l.user_id === GUEST_USER_ID);
        if (!loan) throw new Error("Loan not found.");
        const payment = addRecord(state.loanPayments, {
          loan_id: loanId, amount: Number(payload.amount), principal_paid: Number(payload.amount),
          interest_paid: 0, payment_date: payload.payment_date, notes: payload.notes ?? null,
          allocation_method: "automatic",
        });
        log("loan.payment_recorded", "loan", loanId, { amount: payment.amount });
        return response({ payment }).value as T;
      }
      if (method === "DELETE" && parts[2] === "payments") {
        if (!deleteRecord(state.loanPayments, parts[3])) throw new Error("Loan payment not found.");
        log("loan.payment_deleted", "loan", loanId, { payment_id: parts[3] });
        return undefined as T;
      }
      if (method === "DELETE") {
        if (!deleteRecord(state.loans, loanId)) throw new Error("Loan not found.");
        state.loanPayments = state.loanPayments.filter(p => p.loan_id !== loanId);
        log("loan.deleted", "loan", loanId);
        return undefined as T;
      }
    }
  }

  if (parts[0] === "activity" && method === "GET") {
    return response({ activities: owned(state.activities) }).value as T;
  }

  throw new Error("This feature is not available in guest mode yet.");
}
