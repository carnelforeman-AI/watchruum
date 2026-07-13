"use server";

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import {
  stripeClient,
  stripeConfigured,
  priceIdFor,
  appUrl,
  type Plan,
  type Billing,
} from "@/lib/stripe/server";

export type CheckoutResult =
  | { ok: true; url: string }
  | { ok: false; reason: "auth" | "unconfigured" | "none" | "error"; message?: string };

/**
 * Pick the Free plan at the "choose a plan" wall. Marks the member as having
 * passed the wall (plan_chosen_at) with tier=free. RLS only lets a member
 * write their own row while tier is 'free', so this can't fake a paid plan.
 */
export async function chooseFreePlan(): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  if (!supabase) return { ok: false, error: "Not available." };
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Please sign in." };

  const { error } = await supabase
    .from("memberships")
    .upsert(
      { user_id: user.id, membership_tier: "free", plan_chosen_at: new Date().toISOString() },
      { onConflict: "user_id" },
    );
  return { ok: !error, error: error?.message };
}

/**
 * Start a subscription Checkout for the signed-in user and return the hosted
 * Checkout URL for the client to redirect to.
 *
 * Returns `reason: "unconfigured"` until Stripe keys + the matching price ID are
 * present — the UI treats that as "checkout coming soon" rather than an error.
 */
export async function createCheckout(plan: Plan, billing: Billing): Promise<CheckoutResult> {
  const supabase = await createClient();
  if (!supabase) return { ok: false, reason: "unconfigured" };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, reason: "auth" };

  const stripe = stripeClient();
  const priceId = priceIdFor(plan, billing);
  if (!stripe || !priceId) return { ok: false, reason: "unconfigured" };

  try {
    // Reuse the member's Stripe customer if we've created one before.
    const [{ data: mem }, { data: profile }] = await Promise.all([
      supabase.from("memberships").select("stripe_customer_id").eq("user_id", user.id).maybeSingle(),
      supabase.from("profiles").select("display_name").eq("id", user.id).maybeSingle(),
    ]);
    const displayName = (profile as { display_name?: string | null } | null)?.display_name ?? undefined;

    let customerId = (mem as { stripe_customer_id?: string | null } | null)?.stripe_customer_id ?? null;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email ?? undefined,
        name: displayName,
        metadata: { supabase_user_id: user.id },
      });
      customerId = customer.id;
      // Store the customer id on the membership row. Prefer the service client
      // (trusted); the tier stays 'free' so the owner-write RLS path works too.
      const svc = createServiceClient();
      const writer = svc ?? supabase;
      await writer
        .from("memberships")
        .upsert({ user_id: user.id, stripe_customer_id: customerId }, { onConflict: "user_id" });
    }

    const base = appUrl();
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      allow_promotion_codes: true,
      client_reference_id: user.id,
      success_url: `${base}/upgrade/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${base}/upgrade`,
      metadata: { supabase_user_id: user.id, plan, billing },
      subscription_data: { metadata: { supabase_user_id: user.id, plan, billing } },
    });

    if (!session.url) return { ok: false, reason: "error", message: "Stripe did not return a URL." };
    return { ok: true, url: session.url };
  } catch (e) {
    return { ok: false, reason: "error", message: e instanceof Error ? e.message : "Checkout failed." };
  }
}

/**
 * Open the Stripe Billing Portal so a member can update or cancel their plan.
 * Returns `reason: "none"` if they have no Stripe customer yet.
 */
export async function createBillingPortal(): Promise<CheckoutResult> {
  const supabase = await createClient();
  if (!supabase) return { ok: false, reason: "unconfigured" };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, reason: "auth" };

  const stripe = stripeClient();
  if (!stripe) return { ok: false, reason: "unconfigured" };

  try {
    const { data: mem } = await supabase
      .from("memberships")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .maybeSingle();
    const customerId = (mem as { stripe_customer_id?: string | null } | null)?.stripe_customer_id;
    if (!customerId) return { ok: false, reason: "none" };

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${appUrl()}/settings`,
    });
    return { ok: true, url: session.url };
  } catch (e) {
    return { ok: false, reason: "error", message: e instanceof Error ? e.message : "Portal failed." };
  }
}
