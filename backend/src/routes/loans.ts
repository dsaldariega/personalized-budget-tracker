import { Router } from "express";
import { z } from "zod";
import type { SupabaseClient, User } from "@supabase/supabase-js";

const router = Router();
const loanSelect = "id,user_id,account_id,name,principal_amount,monthly_interest_rate,interest_type,term_months,start_date,due_date,notes,status,created_at";
const paymentSelect = "id,user_id,loan_id,amount,principal_paid,interest_paid,payment_date,notes,allocation_method,created_at";

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const loanSchema = z.object({
  account_id: z.string().uuid(),
  name: z.string().trim().min(1).max(100),
  principal_amount: z.number().finite().positive().max(999999999999.99),
  monthly_interest_rate: z.number().finite().min(0).max(100),
  interest_type: z.enum(["flat_rate", "reducing_balance"]).default("reducing_balance"),
  term_months: z.number().int().min(1).max(600),
  start_date: dateSchema,
  due_date: dateSchema.nullable().optional(),
  notes: z.string().max(500).nullable(),
  status: z.enum(["active", "paid", "paused"]),
});
const paymentSchema = z.object({
  amount: z.number().finite().positive().max(999999999999.99),
  payment_date: dateSchema,
  notes: z.string().max(300).nullable(),
});
const statusSchema = z.object({ status: z.enum(["active", "paid", "paused"]) });

type LoanRecord = {
  id: string; user_id: string; principal_amount: number | string;
  monthly_interest_rate: number | string; interest_type?: "flat_rate" | "reducing_balance";
  term_months: number; start_date: string; status: "active" | "paid" | "paused";
};
type PaymentRecord = {
  id: string; loan_id: string; amount: number | string; principal_paid: number | string;
  interest_paid: number | string; payment_date: string; notes: string | null;
  allocation_method: "manual" | "automatic"; created_at: string;
};

function context(res: import("express").Response) {
  return { supabase: res.locals.supabase as SupabaseClient, user: res.locals.user as User };
}
function calculateDueDate(startDate: string, months: number) {
  const [year, month, day] = startDate.split("-").map(Number);
  const targetMonth = month - 1 + months;
  const targetYear = year + Math.floor(targetMonth / 12);
  const normalizedMonth = targetMonth % 12;
  const lastDay = new Date(Date.UTC(targetYear, normalizedMonth + 1, 0)).getUTCDate();
  return [targetYear, String(normalizedMonth + 1).padStart(2, "0"), String(Math.min(day, lastDay)).padStart(2, "0")].join("-");
}
function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
function monthsBetween(from: string, to: string) {
  const start = Date.parse(`${from}T00:00:00.000Z`);
  const end = Date.parse(`${to}T00:00:00.000Z`);
  return Number.isFinite(start) && Number.isFinite(end)
    ? Math.max(0, (end - start) / 86400000 / 30.4375)
    : 0;
}
function orderedPayments(payments: PaymentRecord[]) {
  return [...payments].sort((a, b) =>
    a.payment_date.localeCompare(b.payment_date) || a.created_at.localeCompare(b.created_at),
  );
}
function paymentPlan(loan: LoanRecord, payments: PaymentRecord[], recalculateAutomatic = false) {
  let outstandingPrincipal = roundMoney(Number(loan.principal_amount));
  let accruedInterest = 0;
  let flatInterestAccrued = 0;
  let totalInterestPaid = 0;
  let accrualDate = loan.start_date;
  const originalPrincipal = Number(loan.principal_amount);
  const monthlyRate = Number(loan.monthly_interest_rate) / 100;
  const totalFlatInterest = roundMoney(originalPrincipal * monthlyRate * Number(loan.term_months));
  const isFlat = loan.interest_type === "flat_rate";
  const allocations: Array<{ id: string; principal_paid: number; interest_paid: number }> = [];
  for (const payment of orderedPayments(payments)) {
    if (payment.payment_date < loan.start_date) return { error: "A payment date cannot be before the loan start date." } as const;
    const elapsed = monthsBetween(accrualDate, payment.payment_date);
    if (isFlat) {
      flatInterestAccrued = roundMoney(Math.min(totalFlatInterest, flatInterestAccrued + originalPrincipal * monthlyRate * elapsed));
      accruedInterest = roundMoney(Math.max(0, flatInterestAccrued - totalInterestPaid));
    } else accruedInterest = roundMoney(accruedInterest + outstandingPrincipal * monthlyRate * elapsed);
    let principalPaid = roundMoney(Number(payment.principal_paid));
    let interestPaid = roundMoney(Number(payment.interest_paid));
    if (recalculateAutomatic && payment.allocation_method === "automatic") {
      const amount = roundMoney(Number(payment.amount));
      interestPaid = roundMoney(Math.min(amount, accruedInterest));
      principalPaid = roundMoney(Math.min(Math.max(0, amount - interestPaid), outstandingPrincipal));
      if (isFlat) {
        const futureInterest = Math.max(0, totalFlatInterest - totalInterestPaid - accruedInterest);
        const futureInterestPaid = roundMoney(Math.min(Math.max(0, amount - interestPaid - principalPaid), futureInterest));
        interestPaid = roundMoney(interestPaid + futureInterestPaid);
      }
      if (amount > interestPaid + principalPaid + 0.009) return { error: `Payment on ${payment.payment_date} exceeds the remaining loan obligation. Delete later payments first or review this payment.` } as const;
      allocations.push({ id: payment.id, principal_paid: principalPaid, interest_paid: interestPaid });
    }
    totalInterestPaid = roundMoney(totalInterestPaid + interestPaid);
    accruedInterest = roundMoney(Math.max(0, accruedInterest - interestPaid));
    outstandingPrincipal = roundMoney(Math.max(0, outstandingPrincipal - principalPaid));
    accrualDate = payment.payment_date;
  }
  return { allocations, outstandingPrincipal, accruedInterest, flatInterestAccrued, totalInterestPaid, lastPaymentDate: accrualDate } as const;
}
async function logActivity(
  supabase: SupabaseClient,
  userId: string,
  action: string,
  entityId: string | null,
  details: Record<string, unknown>,
) {
  const { error } = await supabase.from("activity_logs").insert({
    user_id: userId, action, entity_type: "loan", entity_id: entityId, details,
  });
  if (error) console.error("Unable to write loan activity log:", error.message);
}
async function accountIsAvailable(
  supabase: SupabaseClient, userId: string, accountId: string, allowArchived = false,
) {
  let query = supabase.from("accounts").select("id,is_archived")
    .eq("id", accountId).eq("user_id", userId);
  if (!allowArchived) query = query.eq("is_archived", false);
  const { data, error } = await query.maybeSingle();
  return { available: Boolean(data), error };
}
async function loadLoan(supabase: SupabaseClient, userId: string, loanId: string) {
  return supabase.from("loans").select(loanSelect)
    .eq("id", loanId).eq("user_id", userId).maybeSingle();
}
async function loadPayments(supabase: SupabaseClient, userId: string, loanId: string) {
  return supabase.from("loan_payments").select(paymentSelect)
    .eq("loan_id", loanId).eq("user_id", userId)
    .order("payment_date").order("created_at");
}
async function updateLoanPaymentStatus(
  supabase: SupabaseClient, userId: string, loan: LoanRecord, plan: { outstandingPrincipal: number; accruedInterest: number; totalInterestPaid?: number },
) {
  const flatInterestRemaining = loan.interest_type === "flat_rate" ? Math.max(0, roundMoney(Number(loan.principal_amount) * Number(loan.monthly_interest_rate) / 100 * Number(loan.term_months)) - (plan.totalInterestPaid ?? 0)) : plan.accruedInterest;
  const status = plan.outstandingPrincipal <= 0.009 && flatInterestRemaining <= 0.009
    ? "paid"
    : loan.status === "paid" ? "active" : loan.status;
  if (status === loan.status) return;
  const { error } = await supabase.from("loans").update({ status })
    .eq("id", loan.id).eq("user_id", userId);
  if (error) console.error("Unable to update loan payment status:", error.message);
}

router.get("/", async (_req, res) => {
  const { supabase, user } = context(res);
  const [accounts, loans, payments] = await Promise.all([
    supabase.from("accounts").select("id,name,currency,is_archived").eq("user_id", user.id).order("name"),
    supabase.from("loans").select(loanSelect).eq("user_id", user.id).order("created_at", { ascending: false }),
    supabase.from("loan_payments").select(paymentSelect).eq("user_id", user.id).order("payment_date", { ascending: false }),
  ]);
  const failure = accounts.error ?? loans.error ?? payments.error;
  if (failure) {
    res.status(500).json({ error: "Unable to load loans.", details: failure.message });
    return;
  }
  res.json({ accounts: accounts.data ?? [], loans: loans.data ?? [], payments: payments.data ?? [] });
});

router.post("/", async (req, res) => {
  const parsed = loanSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid loan details.", details: parsed.error.flatten() });
    return;
  }
  const { supabase, user } = context(res);
  const account = await accountIsAvailable(supabase, user.id, parsed.data.account_id);
  if (account.error) {
    res.status(500).json({ error: "Unable to verify the selected account.", details: account.error.message });
    return;
  }
  if (!account.available) {
    res.status(400).json({ error: "Choose an active account that belongs to you." });
    return;
  }
  const dueDate = calculateDueDate(parsed.data.start_date, parsed.data.term_months);
  const { data, error } = await supabase.from("loans")
    .insert({ ...parsed.data, due_date: dueDate, user_id: user.id })
    .select(loanSelect).single();
  if (error) {
    res.status(400).json({ error: "Unable to create loan.", details: error.message });
    return;
  }
  await logActivity(supabase, user.id, "loan.created", data.id, {
    name: data.name, principal_amount: Number(data.principal_amount),
    monthly_interest_rate: Number(data.monthly_interest_rate), status: data.status,
  });
  res.status(201).json({ loan: data });
});

router.put("/:id", async (req, res) => {
  const parsed = loanSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid loan details.", details: parsed.error.flatten() });
    return;
  }
  const { supabase, user } = context(res);
  const { data: existing, error: lookupError } = await loadLoan(supabase, user.id, req.params.id);
  if (lookupError || !existing) {
    res.status(lookupError ? 500 : 404).json({ error: "Loan not found.", details: lookupError?.message });
    return;
  }
  const { data: history, error: historyError } = await loadPayments(supabase, user.id, existing.id);
  if (historyError) { res.status(500).json({ error: "Unable to verify loan repayment history.", details: historyError.message }); return; }
  const hasPayments = (history ?? []).length > 0;
  const termsChanged = Number(existing.principal_amount) !== parsed.data.principal_amount || Number(existing.monthly_interest_rate) !== parsed.data.monthly_interest_rate || Number(existing.term_months) !== parsed.data.term_months || existing.start_date !== parsed.data.start_date || (existing.interest_type ?? "reducing_balance") !== parsed.data.interest_type;
  if (hasPayments && termsChanged) { res.status(409).json({ error: "Loan calculation details cannot be changed after repayments have been recorded. Keep the original terms or create a separate loan record." }); return; }
  const account = await accountIsAvailable(
    supabase, user.id, parsed.data.account_id, existing.account_id === parsed.data.account_id,
  );
  if (account.error) {
    res.status(500).json({ error: "Unable to verify the selected account.", details: account.error.message });
    return;
  }
  if (!account.available) {
    res.status(400).json({ error: "Choose an active account that belongs to you." });
    return;
  }
  const dueDate = calculateDueDate(parsed.data.start_date, parsed.data.term_months);
  const { data, error } = await supabase.from("loans").update({ ...parsed.data, due_date: dueDate })
    .eq("id", existing.id).eq("user_id", user.id).select(loanSelect).maybeSingle();
  if (error || !data) {
    res.status(error ? 400 : 404).json({ error: "Unable to update loan.", details: error?.message });
    return;
  }
  await logActivity(supabase, user.id, "loan.updated", data.id, {
    name: data.name, principal_amount: Number(data.principal_amount),
    monthly_interest_rate: Number(data.monthly_interest_rate), status: data.status,
  });
  res.json({ loan: data });
});

router.patch("/:id/status", async (req, res) => {
  const parsed = statusSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid loan status.", details: parsed.error.flatten() });
    return;
  }
  const { supabase, user } = context(res);
  const { data, error } = await supabase.from("loans").update({ status: parsed.data.status })
    .eq("id", req.params.id).eq("user_id", user.id).select(loanSelect).maybeSingle();
  if (error || !data) {
    res.status(error ? 400 : 404).json({ error: "Unable to update loan status.", details: error?.message });
    return;
  }
  await logActivity(supabase, user.id, "loan.status_updated", data.id, { name: data.name, status: data.status });
  res.json({ loan: data });
});

router.post("/:id/payments", async (req, res) => {
  const parsed = paymentSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid loan payment details.", details: parsed.error.flatten() });
    return;
  }
  const { supabase, user } = context(res);
  const { data: loan, error: loanError } = await loadLoan(supabase, user.id, req.params.id);
  if (loanError || !loan) {
    res.status(loanError ? 500 : 404).json({ error: "Loan not found.", details: loanError?.message });
    return;
  }
  if (parsed.data.payment_date < loan.start_date) {
    res.status(400).json({ error: "Payment date cannot be before the loan start date." });
    return;
  }
  const { data: payments, error: paymentsError } = await loadPayments(supabase, user.id, loan.id);
  if (paymentsError) {
    res.status(500).json({ error: "Unable to load repayment history.", details: paymentsError.message });
    return;
  }
  const previous = paymentPlan(loan as LoanRecord, (payments ?? []) as PaymentRecord[]);
  if ("error" in previous) {
    res.status(409).json({ error: previous.error });
    return;
  }
  if (parsed.data.payment_date < previous.lastPaymentDate) {
    res.status(400).json({ error: "Payment date cannot be earlier than the previous payment." });
    return;
  }

  const months = monthsBetween(previous.lastPaymentDate, parsed.data.payment_date);
  const monthlyRate = Number(loan.monthly_interest_rate) / 100;
  const isFlat = loan.interest_type === "flat_rate";
  const totalFlatInterest = roundMoney(Number(loan.principal_amount) * monthlyRate * Number(loan.term_months));
  const flatInterestAccrued = isFlat ? roundMoney(Math.min(totalFlatInterest, previous.flatInterestAccrued + Number(loan.principal_amount) * monthlyRate * months)) : previous.flatInterestAccrued;
  const accruedInterest = isFlat ? roundMoney(Math.max(0, flatInterestAccrued - previous.totalInterestPaid)) : roundMoney(previous.accruedInterest + previous.outstandingPrincipal * monthlyRate * months);
  let interestPaid = roundMoney(Math.min(parsed.data.amount, accruedInterest));
  const principalPaid = roundMoney(Math.min(
    Math.max(0, parsed.data.amount - interestPaid), previous.outstandingPrincipal,
  ));
  if (isFlat) {
    const futureInterest = Math.max(0, totalFlatInterest - previous.totalInterestPaid - accruedInterest);
    interestPaid = roundMoney(interestPaid + Math.min(
      Math.max(0, parsed.data.amount - interestPaid - principalPaid), futureInterest,
    ));
  }
  if (parsed.data.amount > interestPaid + principalPaid + 0.009) {
    res.status(400).json({ error: "Payment cannot exceed the remaining loan obligation." });
    return;
  }

  const { data, error } = await supabase.from("loan_payments").insert({
    user_id: user.id, loan_id: loan.id, amount: parsed.data.amount,
    principal_paid: principalPaid, interest_paid: interestPaid,
    payment_date: parsed.data.payment_date, notes: parsed.data.notes,
    allocation_method: "automatic",
  }).select(paymentSelect).single();
  if (error) {
    res.status(400).json({ error: "Unable to record loan payment.", details: error.message });
    return;
  }

  const nextPlan = {
    outstandingPrincipal: roundMoney(previous.outstandingPrincipal - principalPaid),
    accruedInterest: roundMoney(accruedInterest - interestPaid),
    totalInterestPaid: roundMoney(previous.totalInterestPaid + interestPaid),
  };
  await updateLoanPaymentStatus(supabase, user.id, loan as LoanRecord, nextPlan);
  await logActivity(supabase, user.id, "loan.payment_recorded", loan.id, {
    amount: parsed.data.amount, principal_paid: principalPaid, interest_paid: interestPaid,
    payment_date: parsed.data.payment_date, allocation_method: "automatic",
  });
  res.status(201).json({ payment: data });
});

router.delete("/:id/payments/:paymentId", async (req, res) => {
  const { supabase, user } = context(res);
  const { data: loan, error: loanError } = await loadLoan(supabase, user.id, req.params.id);
  if (loanError || !loan) {
    res.status(loanError ? 500 : 404).json({ error: "Loan not found.", details: loanError?.message });
    return;
  }
  const { data: target, error: targetError } = await supabase.from("loan_payments")
    .select(paymentSelect).eq("id", req.params.paymentId).eq("loan_id", loan.id)
    .eq("user_id", user.id).maybeSingle();
  if (targetError || !target) {
    res.status(targetError ? 500 : 404).json({ error: "Loan payment not found.", details: targetError?.message });
    return;
  }
  const { data: payments, error: paymentsError } = await loadPayments(supabase, user.id, loan.id);
  if (paymentsError) {
    res.status(500).json({ error: "Unable to load repayment history.", details: paymentsError.message });
    return;
  }
  const remainingPayments = ((payments ?? []) as PaymentRecord[]).filter(p => p.id !== target.id);
  const plan = paymentPlan(loan as LoanRecord, remainingPayments, true);
  if ("error" in plan) {
    res.status(409).json({ error: plan.error });
    return;
  }

  const { error: deleteError } = await supabase.from("loan_payments").delete()
    .eq("id", target.id).eq("loan_id", loan.id).eq("user_id", user.id);
  if (deleteError) {
    res.status(400).json({ error: "Unable to delete loan payment.", details: deleteError.message });
    return;
  }
  for (const allocation of plan.allocations) {
    const existing = remainingPayments.find(p => p.id === allocation.id);
    if (!existing || (Number(existing.principal_paid) === allocation.principal_paid &&
      Number(existing.interest_paid) === allocation.interest_paid)) continue;
    const { error } = await supabase.from("loan_payments").update({
      principal_paid: allocation.principal_paid, interest_paid: allocation.interest_paid,
    }).eq("id", allocation.id).eq("user_id", user.id);
    if (error) {
      res.status(500).json({ error: "Payment was deleted, but a later automatic allocation could not be recalculated.", details: error.message });
      return;
    }
  }
  await updateLoanPaymentStatus(supabase, user.id, loan as LoanRecord, { ...plan, totalInterestPaid: plan.totalInterestPaid });
  await logActivity(supabase, user.id, "loan.payment_deleted", loan.id, {
    amount: Number(target.amount), payment_date: target.payment_date,
  });
  res.status(204).end();
});

router.delete("/:id", async (req, res) => {
  const { supabase, user } = context(res);
  const { data: existing, error: lookupError } = await loadLoan(supabase, user.id, req.params.id);
  if (lookupError || !existing) {
    res.status(lookupError ? 500 : 404).json({ error: "Loan not found.", details: lookupError?.message });
    return;
  }
  const { error } = await supabase.from("loans").delete()
    .eq("id", existing.id).eq("user_id", user.id);
  if (error) {
    res.status(400).json({ error: "Unable to delete loan.", details: error.message });
    return;
  }
  await logActivity(supabase, user.id, "loan.deleted", existing.id, { name: existing.name });
  res.status(204).end();
});

export default router;
