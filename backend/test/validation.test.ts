import assert from "node:assert/strict";
import test from "node:test";
import {
  nonNegativeMoneySchema,
  positiveMoneySchema,
  signedMoneySchema,
} from "../src/lib/validation.js";

test("positive money accepts valid amounts with up to two decimal places", () => {
  for (const value of [0.01, 1, 12.3, 12.34, 999999999999.99]) {
    assert.equal(positiveMoneySchema.safeParse(value).success, true, String(value));
  }
});

test("positive money rejects zero, negatives, excess precision, and overflow", () => {
  for (const value of [0, -0.01, 1.001, 999999999999.991, Number.NaN, Number.POSITIVE_INFINITY]) {
    assert.equal(positiveMoneySchema.safeParse(value).success, false, String(value));
  }
});

test("non-negative money accepts zero and valid positive amounts", () => {
  for (const value of [0, 0.01, 100.25]) {
    assert.equal(nonNegativeMoneySchema.safeParse(value).success, true, String(value));
  }
  for (const value of [-0.01, 100.256]) {
    assert.equal(nonNegativeMoneySchema.safeParse(value).success, false, String(value));
  }
});

test("signed money accepts negative balances but enforces two-decimal precision", () => {
  for (const value of [-1000.25, -0.01, 0, 0.01, 1000.25]) {
    assert.equal(signedMoneySchema.safeParse(value).success, true, String(value));
  }
  for (const value of [-1000.256, 1000.256, 1000000000000]) {
    assert.equal(signedMoneySchema.safeParse(value).success, false, String(value));
  }
});
