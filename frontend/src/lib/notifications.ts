"use client";

export type AppNotification = {
  id: string;
  type: "budget" | "goal" | "subscription";
  severity: "info" | "warning" | "error" | "success";
  title: string;
  message: string;
  href: string;
  createdAt: string;
};

type Account = { id: string; currency?: string };
type Budget = {
  id: string; name: string; category: string; account_id: string;
  amount: number; period: "weekly" | "monthly" | "yearly" | "custom";
  start_date: string; end_date: string | null;
};
type Expense = {
  account_id: string; category: string | null; amount: number;
  transaction_date: string; transaction_type: string;
};
type Goal = { id: string; name: string; target_amount: number; current_amount: number; status: string };
type Subscription = {
  id: string; name: string; amount: number; next_billing_date: string;
  is_active: boolean; account_id: string;
};

const dateOnly = (date: Date) => [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("-");
const parseDate = (value: string) => new Date(`${value}T00:00:00.000Z`);
const dayDiff = (a: Date, b: Date) => Math.floor((b.getTime() - a.getTime()) / 86400000);
const money = (value: number, currency = "PHP") =>
  new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: 0 }).format(value);

function budgetRange(budget: Budget, today: Date) {
  const anchor = parseDate(budget.start_date);
  if (today < anchor) return null;
  if (budget.end_date && today > parseDate(budget.end_date)) return null;
  if (budget.period === "custom") return { start: budget.start_date, end: budget.end_date ?? budget.start_date };
  if (budget.period === "weekly") {
    const start = new Date(anchor);
    start.setUTCDate(start.getUTCDate() + Math.floor(dayDiff(anchor, today) / 7) * 7);
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 6);
    return { start: dateOnly(start), end: budget.end_date && end > parseDate(budget.end_date) ? budget.end_date : dateOnly(end) };
  }
  if (budget.period === "monthly") {
    let months = (today.getUTCFullYear() - anchor.getUTCFullYear()) * 12 + today.getUTCMonth() - anchor.getUTCMonth();
    const makeStart = (offset: number) => new Date(Date.UTC(
      anchor.getUTCFullYear(), anchor.getUTCMonth() + offset,
      Math.min(anchor.getUTCDate(), new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth() + offset + 1, 0)).getUTCDate()),
    ));
    if (today < makeStart(months)) months -= 1;
    const start = makeStart(months);
    const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 0));
    return { start: dateOnly(start), end: budget.end_date && end > parseDate(budget.end_date) ? budget.end_date : dateOnly(end) };
  }
  let years = today.getUTCFullYear() - anchor.getUTCFullYear();
  const makeYearStart = (offset: number) => new Date(Date.UTC(
    anchor.getUTCFullYear() + offset, anchor.getUTCMonth(),
    Math.min(anchor.getUTCDate(), new Date(Date.UTC(anchor.getUTCFullYear() + offset, anchor.getUTCMonth() + 1, 0)).getUTCDate()),
  ));
  if (today < makeYearStart(years)) years -= 1;
  const start = makeYearStart(years);
  const nextStart = makeYearStart(years + 1);
  const end = new Date(nextStart);
  end.setUTCDate(end.getUTCDate() - 1);
  return { start: dateOnly(start), end: budget.end_date && end > parseDate(budget.end_date) ? budget.end_date : dateOnly(end) };
}

export function buildNotifications(data: {
  accounts: Account[];
  budgets: Budget[];
  expenses: Expense[];
  goals: Goal[];
  subscriptions: Subscription[];
}): AppNotification[] {
  const today = parseDate(dateOnly(new Date()));
  const currencyByAccount = new Map(data.accounts.map(account => [account.id, account.currency ?? "PHP"]));
  const notifications: AppNotification[] = [];

  for (const budget of data.budgets) {
    const range = budgetRange(budget, today);
    if (!range) continue;
    const spent = data.expenses
      .filter(expense => expense.account_id === budget.account_id
        && expense.transaction_type === "expense"
        && (expense.category ?? "").toLowerCase() === budget.category.toLowerCase()
        && expense.transaction_date >= range.start
        && expense.transaction_date <= range.end)
      .reduce((total, expense) => total + Number(expense.amount || 0), 0);
    const percent = Number(budget.amount) > 0 ? spent / Number(budget.amount) * 100 : 0;
    if (percent < 80) continue;
    const exceeded = percent >= 100;
    notifications.push({
      id: `budget:${budget.id}:${range.start}`,
      type: "budget",
      severity: exceeded ? "error" : "warning",
      title: exceeded ? "Budget limit exceeded" : "Budget getting close",
      message: `${budget.name}: you've used ${Math.round(percent)}% of your ${money(Number(budget.amount), currencyByAccount.get(budget.account_id))} budget (${money(spent, currencyByAccount.get(budget.account_id))} spent).`,
      href: "/budgets",
      createdAt: new Date().toISOString(),
    });
  }

  for (const goal of data.goals) {
    if (goal.status === "paused" || Number(goal.target_amount) <= 0) continue;
    const percent = Number(goal.current_amount) / Number(goal.target_amount) * 100;
    const milestone = [100, 75, 50, 25].find(value => percent >= value);
    if (!milestone) continue;
    notifications.push({
      id: `goal:${goal.id}:${milestone}`,
      type: "goal",
      severity: milestone === 100 ? "success" : "info",
      title: milestone === 100 ? "Savings goal reached!" : `You're ${milestone}% of the way there`,
      message: `${goal.name} has reached ${Math.min(100, Math.round(percent))}% of its target. Keep up the great work!`,
      href: "/goals",
      createdAt: new Date().toISOString(),
    });
  }

  for (const subscription of data.subscriptions) {
    if (!subscription.is_active || !subscription.next_billing_date) continue;
    const due = parseDate(subscription.next_billing_date);
    const days = dayDiff(today, due);
    if (days < -7 || days > 3) continue;
    const overdue = days < 0;
    notifications.push({
      id: `subscription:${subscription.id}:${subscription.next_billing_date}`,
      type: "subscription",
      severity: overdue || days === 0 ? "warning" : "info",
      title: overdue ? "Subscription payment overdue" : days === 0 ? "Subscription due today" : "Upcoming subscription payment",
      message: `${subscription.name} (${money(Number(subscription.amount), currencyByAccount.get(subscription.account_id))}) is ${overdue ? `${Math.abs(days)} day${days === -1 ? "" : "s"} overdue` : days === 0 ? "due today" : `due in ${days} day${days === 1 ? "" : "s"}`}.`,
      href: "/subscriptions",
      createdAt: new Date().toISOString(),
    });
  }

  return notifications.sort((a, b) => {
    const severity = { error: 0, warning: 1, info: 2, success: 3 };
    return severity[a.severity] - severity[b.severity];
  });
}
