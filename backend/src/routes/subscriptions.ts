import { Router } from "express";
import { z } from "zod";
import type { SupabaseClient, User } from "@supabase/supabase-js";

const router = Router();
const subscriptionSelect = "id,user_id,account_id,name,amount,billing_frequency,next_billing_date,category,notes,is_active,created_at";
const paymentSelect = "id,user_id,subscription_id,amount,billing_date,paid_date,notes,created_at";
const dateSchema = z.string().regex(/^\\d{4}-\\d{2}-\\d{2}$/);
const subscriptionSchema = z.object({
  account_id: z.string().uuid(),
  name: z.string().trim().min(1).max(100),
  amount: z.number().finite().positive().max(999999999999.99),
  billing_frequency: z.enum(["weekly", "monthly", "quarterly", "yearly"]),
  next_billing_date: dateSchema,
  category: z.string().max(80).nullable(),
  notes: z.string().max(500).nullable(),
  is_active: z.boolean(),
});
const paymentSchema = z.object({
  amount: z.number().finite().positive().max(999999999999.99),
  paid_date: dateSchema,
  notes: z.string().max(500).nullable(),
});

function context(res: import("express").Response) {
  return { supabase: res.locals.supabase as SupabaseClient, user: res.locals.user as User };
}
function addBillingPeriod(value: string, frequency: "weekly" | "monthly" | "quarterly" | "yearly") {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (frequency === "weekly") date.setUTCDate(date.getUTCDate() + 7);
  else {
    const months = frequency === "monthly" ? 1 : frequency === "quarterly" ? 3 : 12;
    const targetMonth = date.getUTCMonth() + months;
    const lastDay = new Date(Date.UTC(date.getUTCFullYear(), targetMonth + 1, 0)).getUTCDate();
    date.setUTCDate(1);
    date.setUTCMonth(targetMonth);
    date.setUTCDate(Math.min(day, lastDay));
  }
  return date.toISOString().slice(0, 10);
}
async function logActivity(
  supabase: SupabaseClient, userId: string, action: string,
  entityId: string | null, details: Record<string, unknown>,
) {
  const { error } = await supabase.from("activity_logs").insert({
    user_id: userId, action, entity_type: "subscription", entity_id: entityId, details,
  });
  if (error) console.error("Unable to write subscription activity log:", error.message);
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
async function loadSubscription(supabase: SupabaseClient, userId: string, id: string) {
  return supabase.from("subscriptions").select(subscriptionSelect)
    .eq("id", id).eq("user_id", userId).maybeSingle();
}

router.get("/", async (_req, res) => {
  const { supabase, user } = context(res);
  const [accounts, subscriptions, payments] = await Promise.all([
    supabase.from("accounts").select("id,name,currency,is_archived")
      .eq("user_id", user.id).order("name"),
    supabase.from("subscriptions").select(subscriptionSelect)
      .eq("user_id", user.id).order("next_billing_date"),
    supabase.from("subscription_payments").select(paymentSelect)
      .eq("user_id", user.id).order("paid_date", { ascending: false }),
  ]);
  const failure = accounts.error ?? subscriptions.error ?? payments.error;
  if (failure) {
    res.status(500).json({ error: "Unable to load subscriptions.", details: failure.message });
    return;
  }
  res.json({ accounts: accounts.data ?? [], subscriptions: subscriptions.data ?? [], payments: payments.data ?? [] });
});

router.post("/", async (req, res) => {
  const parsed = subscriptionSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid subscription details.", details: parsed.error.flatten() });
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
  const { data, error } = await supabase.from("subscriptions")
    .insert({ ...parsed.data, user_id: user.id })
    .select(subscriptionSelect).single();
  if (error) {
    res.status(400).json({ error: "Unable to create subscription.", details: error.message });
    return;
  }
  await logActivity(supabase, user.id, "subscription.created", data.id, {
    name: data.name, amount: Number(data.amount), billing_frequency: data.billing_frequency, account_id: data.account_id,
  });
  res.status(201).json({ subscription: data });
});

router.put("/:id", async (req, res) => {
  const parsed = subscriptionSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid subscription details.", details: parsed.error.flatten() });
    return;
  }
  const { supabase, user } = context(res);
  const { data: existing, error: lookupError } = await loadSubscription(supabase, user.id, req.params.id);
  if (lookupError || !existing) {
    res.status(lookupError ? 500 : 404).json({ error: "Subscription not found.", details: lookupError?.message });
    return;
  }
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
  const { data, error } = await supabase.from("subscriptions").update(parsed.data)
    .eq("id", existing.id).eq("user_id", user.id).select(subscriptionSelect).maybeSingle();
  if (error || !data) {
    res.status(error ? 400 : 404).json({ error: "Unable to update subscription.", details: error?.message });
    return;
  }
  await logActivity(supabase, user.id, "subscription.updated", data.id, {
    name: data.name, amount: Number(data.amount), billing_frequency: data.billing_frequency, account_id: data.account_id,
  });
  res.json({ subscription: data });
});

router.patch("/:id/status", async (req, res) => {
  const parsed = z.object({ is_active: z.boolean() }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Provide an is_active boolean value." });
    return;
  }
  const { supabase, user } = context(res);
  const { data, error } = await supabase.from("subscriptions").update({ is_active: parsed.data.is_active })
    .eq("id", req.params.id).eq("user_id", user.id).select(subscriptionSelect).maybeSingle();
  if (error || !data) {
    res.status(error ? 400 : 404).json({ error: "Unable to update subscription status.", details: error?.message });
    return;
  }
  await logActivity(supabase, user.id, "subscription.status_updated", data.id, {
    name: data.name, is_active: data.is_active,
  });
  res.json({ subscription: data });
});

router.delete("/:id", async (req, res) => {
  const { supabase, user } = context(res);
  const { data: existing, error: lookupError } = await loadSubscription(supabase, user.id, req.params.id);
  if (lookupError || !existing) {
    res.status(lookupError ? 500 : 404).json({ error: "Subscription not found.", details: lookupError?.message });
    return;
  }
  const { error } = await supabase.from("subscriptions").delete()
    .eq("id", existing.id).eq("user_id", user.id);
  if (error) {
    res.status(400).json({ error: "Unable to delete subscription.", details: error.message });
    return;
  }
  await logActivity(supabase, user.id, "subscription.deleted", existing.id, { name: existing.name });
  res.status(204).end();
});

router.post("/:id/payments", async (req, res) => {
  const parsed = paymentSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid subscription payment details.", details: parsed.error.flatten() });
    return;
  }
  const { supabase, user } = context(res);
  const { data: subscription, error: lookupError } = await loadSubscription(supabase, user.id, req.params.id);
  if (lookupError || !subscription) {
    res.status(lookupError ? 500 : 404).json({ error: "Subscription not found.", details: lookupError?.message });
    return;
  }
  const billingDate = subscription.next_billing_date;
  const nextBillingDate = addBillingPeriod(billingDate, subscription.billing_frequency);
  const { data: payment, error: paymentError } = await supabase.from("subscription_payments")
    .insert({
      user_id: user.id, subscription_id: subscription.id, amount: parsed.data.amount,
      billing_date: billingDate, paid_date: parsed.data.paid_date, notes: parsed.data.notes,
    })
    .select(paymentSelect).single();
  if (paymentError) {
    res.status(400).json({ error: "Unable to record subscription payment.", details: paymentError.message });
    return;
  }
  const { error: updateError } = await supabase.from("subscriptions")
    .update({ next_billing_date: nextBillingDate })
    .eq("id", subscription.id).eq("user_id", user.id);
  if (updateError) {
    res.status(500).json({
      error: "Payment was recorded, but the next billing date could not be updated. Refresh and edit the date manually.",
      details: updateError.message, payment,
    });
    return;
  }
  await logActivity(supabase, user.id, "subscription.payment_recorded", subscription.id, {
    name: subscription.name, amount: parsed.data.amount, billing_date: billingDate, next_billing_date: nextBillingDate,
  });
  res.status(201).json({ payment, next_billing_date: nextBillingDate });
});

router.delete("/:id/payments/:paymentId", async (req, res) => {
  const { supabase, user } = context(res);
  const { data: subscription, error: subscriptionError } = await loadSubscription(supabase, user.id, req.params.id);
  if (subscriptionError || !subscription) {
    res.status(subscriptionError ? 500 : 404).json({ error: "Subscription not found.", details: subscriptionError?.message });
    return;
  }
  const { data: payment, error: paymentLookupError } = await supabase.from("subscription_payments")
    .select(paymentSelect).eq("id", req.params.paymentId)
    .eq("subscription_id", subscription.id).eq("user_id", user.id).maybeSingle();
  if (paymentLookupError || !payment) {
    res.status(paymentLookupError ? 500 : 404).json({ error: "Payment history entry not found.", details: paymentLookupError?.message });
    return;
  }
  const { error: deleteError } = await supabase.from("subscription_payments")
    .delete().eq("id", payment.id).eq("subscription_id", subscription.id).eq("user_id", user.id);
  if (deleteError) {
    res.status(400).json({ error: "Unable to delete payment history.", details: deleteError.message });
    return;
  }
  let message = "Payment history entry deleted. The next billing date was left unchanged because a later cycle may already have been processed.";
  if (subscription.next_billing_date === addBillingPeriod(payment.billing_date, subscription.billing_frequency)) {
    const { error: rollbackError } = await supabase.from("subscriptions")
      .update({ next_billing_date: payment.billing_date })
      .eq("id", subscription.id).eq("user_id", user.id);
    if (rollbackError) {
      res.status(500).json({ error: "Payment history deleted, but the next billing date could not be rolled back.", details: rollbackError.message });
      return;
    }
    message = "Payment history deleted and the next billing date was restored.";
  }
  await logActivity(supabase, user.id, "subscription.payment_deleted", subscription.id, {
    name: subscription.name, amount: Number(payment.amount), billing_date: payment.billing_date,
  });
  res.json({ message });
});

export default router;
