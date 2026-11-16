import { z } from "zod";

const MAX_MONEY_AMOUNT = 999999999999.99;

/**
 * Matches the precision of PostgreSQL numeric(14, 2) financial columns.
 * Rejects excess decimal places instead of allowing the database to round
 * user-entered values silently.
 */
const moneyNumberSchema = z.number()
  .finite()
  .min(-MAX_MONEY_AMOUNT)
  .max(MAX_MONEY_AMOUNT)
  .refine(
    (value) => Math.abs(value * 100 - Math.round(value * 100)) < 1e-7,
    { message: "Use no more than 2 decimal places." },
  );

export const signedMoneySchema = moneyNumberSchema;
export const nonNegativeMoneySchema = moneyNumberSchema.min(0);
export const positiveMoneySchema = moneyNumberSchema.positive();
