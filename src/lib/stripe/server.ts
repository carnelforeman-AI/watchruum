import "server-only";
import Stripe from "stripe";

/**
 * Stripe server client + config, built to stay DORMANT until you register with
 * Stripe and add the keys. `stripeClient()` returns null when unconfigured, so
 * the whole checkout flow degrades to a friendly "coming soon" message instead
 * of erroring. Once STRIPE_SECRET_KEY + the price IDs are set in the
 * environment, the same code path lights up automatically.
 *
 * Env vars to set after registering (see STRIPE-SETUP.md):
 *   STRIPE_SECRET_KEY            sk_live_… / sk_test_…
 *   STRIPE_WEBHOOK_SECRET        whsec_…  (from the webhook endpoint)
 *   STRIPE_PRICE_PLUS_MONTHLY    price_…  ($4.99/mo)
 *   STRIPE_PRICE_PLUS_ANNUAL     price_…  ($39.99/yr)
 *   STRIPE_PRICE_FOUNDER_ANNUAL  price_…  ($89/yr)
 *   NEXT_PUBLIC_APP_URL          https://watchruum.vercel.app (redirect base)
 */

export type Plan = "plus" | "founder";
export type Billing = "monthly" | "annual";

const SECRET = process.env.STRIPE_SECRET_KEY ?? "";

/** True once a real secret key is present. */
export function stripeConfigured(): boolean {
  return SECRET.startsWith("sk_");
}

let _stripe: Stripe | null = null;

/** Lazily construct the Stripe client. Returns null when unconfigured. */
export function stripeClient(): Stripe | null {
  if (!stripeConfigured()) return null;
  if (!_stripe) _stripe = new Stripe(SECRET);
  return _stripe;
}

/**
 * Resolve a (plan, billing) pair to its configured Stripe Price ID.
 * Founder is annual-only. Returns null if that price isn't configured yet.
 */
export function priceIdFor(plan: Plan, billing: Billing): string | null {
  if (plan === "founder") return process.env.STRIPE_PRICE_FOUNDER_ANNUAL || null;
  if (billing === "monthly") return process.env.STRIPE_PRICE_PLUS_MONTHLY || null;
  return process.env.STRIPE_PRICE_PLUS_ANNUAL || null;
}

/** Map a Stripe Price ID back to a membership tier for the webhook. */
export function tierForPrice(priceId: string | null | undefined): "plus" | "founder" | null {
  if (!priceId) return null;
  if (priceId === process.env.STRIPE_PRICE_FOUNDER_ANNUAL) return "founder";
  if (
    priceId === process.env.STRIPE_PRICE_PLUS_MONTHLY ||
    priceId === process.env.STRIPE_PRICE_PLUS_ANNUAL
  )
    return "plus";
  return null;
}

/** Base URL for Checkout success/cancel redirects. */
export function appUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    "https://watchruum.vercel.app"
  );
}
