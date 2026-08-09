import Stripe from "stripe";
import { logger } from "./logger.js";

const apiKey = process.env["STRIPE_SECRET_KEY"];

if (!apiKey) {
  logger.warn("STRIPE_SECRET_KEY is not set — Stripe payments will be unavailable");
}

export const stripe: Stripe | null = apiKey
  ? new Stripe(apiKey, { apiVersion: "2026-07-29.dahlia" })
  : null;

export const STRIPE_WEBHOOK_SECRET = process.env["STRIPE_WEBHOOK_SECRET"] ?? "";

// In production, refuse to run without a webhook secret — forged events are too dangerous.
if (process.env["NODE_ENV"] === "production" && !STRIPE_WEBHOOK_SECRET) {
  throw new Error("STRIPE_WEBHOOK_SECRET is required in production");
}

// Pricing constants (cents)
export const BOOK_PRICE_CENTS = 2499;
export const SHIPPING_CENTS = 499;
export const TOTAL_CENTS = BOOK_PRICE_CENTS + SHIPPING_CENTS;
