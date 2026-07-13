import type Stripe from "stripe";
import { stripeClient } from "@/lib/stripe/server";
import { tierForPrice } from "@/lib/stripe/server";
import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Stripe webhook. Keeps profiles.membership_* in sync with the subscription
 * lifecycle. Dormant until STRIPE_SECRET_KEY + STRIPE_WEBHOOK_SECRET are set.
 *
 * Point a Stripe webhook endpoint at:  <app-url>/api/stripe/webhook
 * and subscribe to: checkout.session.completed, customer.subscription.updated,
 * customer.subscription.deleted.
 */
export async function POST(req: Request): Promise<Response> {
  const stripe = stripeClient();
  const whsec = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !whsec) {
    return Response.json({ ok: false, error: "Stripe not configured" }, { status: 400 });
  }

  const sig = req.headers.get("stripe-signature");
  if (!sig) return Response.json({ ok: false, error: "Missing signature" }, { status: 400 });

  const raw = await req.text(); // raw body is required for signature verification
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(raw, sig, whsec);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Invalid signature";
    return Response.json({ ok: false, error: msg }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const subId = typeof session.subscription === "string" ? session.subscription : session.subscription?.id;
        if (subId) {
          const sub = await stripe.subscriptions.retrieve(subId);
          await syncSubscription(sub, session.metadata?.supabase_user_id ?? undefined);
        }
        break;
      }
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        await syncSubscription(sub);
        break;
      }
      default:
        break; // ignore everything else
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Webhook handler failed";
    return Response.json({ ok: false, error: msg }, { status: 500 });
  }

  return Response.json({ received: true });
}

/**
 * Write the subscription's current tier/status into the member's `memberships`
 * row (service-role — the only writer allowed to grant paid tiers). Locates the
 * member by the Supabase user id in metadata, falling back to the customer id.
 */
async function syncSubscription(sub: Stripe.Subscription, userIdHint?: string): Promise<void> {
  const svc = createServiceClient();
  if (!svc) return;

  const item = sub.items.data[0];
  const priceId = item?.price?.id ?? null;
  const active = sub.status === "active" || sub.status === "trialing";
  const tier = sub.status === "canceled" ? "free" : active ? tierForPrice(priceId) ?? "plus" : "free";
  const billing = item?.price?.recurring?.interval === "month" ? "monthly" : "annual";

  const nowIso = new Date().toISOString();
  const patch: Record<string, unknown> = {
    stripe_subscription_id: sub.id,
    membership_tier: tier,
    membership_status: sub.status,
    membership_billing: billing,
    updated_at: nowIso,
  };
  if (active) {
    patch.membership_since = new Date((sub.start_date ?? Math.floor(Date.now() / 1000)) * 1000).toISOString();
    // A completed paid checkout also counts as passing the "choose a plan" wall.
    patch.plan_chosen_at = nowIso;
  }

  const userId = userIdHint ?? (sub.metadata?.supabase_user_id as string | undefined);
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;

  if (userId) {
    await svc.from("memberships").upsert({ user_id: userId, stripe_customer_id: customerId, ...patch }, { onConflict: "user_id" });
  } else if (customerId) {
    await svc.from("memberships").update(patch).eq("stripe_customer_id", customerId);
  }
}
