"use server";

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { stripeClient } from "@/lib/stripe/server";

/**
 * Assemble a member's own data for download (GDPR/CCPA right of access).
 * Reads only rows the member owns, under their RLS session.
 */
export async function exportMyData(): Promise<
  { ok: true; data: Record<string, unknown> } | { ok: false; error: string }
> {
  const supabase = await createClient();
  if (!supabase) return { ok: false, error: "Not available." };
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Please sign in." };
  const uid = user.id;

  const rows = async (
    table: string,
    col: string,
    select = "*",
  ): Promise<unknown[]> => {
    try {
      const { data } = await supabase.from(table).select(select).eq(col, uid);
      return (data as unknown[]) ?? [];
    } catch {
      return [];
    }
  };

  const [profile, membership] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, username, display_name, avatar_url, bio, favorite_genres, is_private, show_activity, preferred_language, spoiler_safety, created_at")
      .eq("id", uid)
      .maybeSingle()
      .then((r) => r.data ?? null, () => null),
    supabase
      .from("memberships")
      .select("membership_tier, membership_status, membership_billing, plan_chosen_at, membership_since")
      .eq("user_id", uid)
      .maybeSingle()
      .then((r) => r.data ?? null, () => null),
  ]);

  const [reviews, ratings, watchStatus, comments, dmsSent, following] = await Promise.all([
    rows("reviews", "user_id"),
    rows("ratings", "user_id"),
    rows("watch_status", "user_id"),
    rows("comments", "user_id"),
    rows("direct_messages", "sender_id"),
    rows("follows", "follower_id"),
  ]);

  return {
    ok: true,
    data: {
      exported_at: new Date().toISOString(),
      account: { id: uid, email: user.email ?? null },
      profile,
      membership,
      reviews,
      ratings,
      watch_status: watchStatus,
      comments,
      direct_messages_sent: dmsSent,
      following,
      note: "This is the personal data associated with your Watchruum account. Direct messages you received are omitted to protect the other participant's privacy.",
    },
  };
}

/**
 * Permanently delete the caller's own account (GDPR/CCPA right to erasure).
 * Cancels any active Stripe subscription, then deletes the auth user — which
 * cascades their profile and all data referencing it. Requires the service
 * role key (also needed for the webhook), so it's dormant until that's set.
 */
export async function deleteMyAccount(confirm: string): Promise<{ ok: boolean; error?: string }> {
  if (confirm.trim().toUpperCase() !== "DELETE") return { ok: false, error: "Type DELETE to confirm." };

  const supabase = await createClient();
  if (!supabase) return { ok: false, error: "Not available." };
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Please sign in." };

  const svc = createServiceClient();
  if (!svc) return { ok: false, error: "Account deletion isn’t available yet (server not fully configured)." };

  // Best-effort: cancel any live subscription so billing stops.
  try {
    const { data: mem } = await svc
      .from("memberships")
      .select("stripe_subscription_id")
      .eq("user_id", user.id)
      .maybeSingle();
    const subId = (mem as { stripe_subscription_id?: string | null } | null)?.stripe_subscription_id;
    const stripe = stripeClient();
    if (stripe && subId) {
      try {
        await stripe.subscriptions.cancel(subId);
      } catch {
        // subscription already gone / not cancellable — proceed with deletion
      }
    }
  } catch {
    // no membership row — nothing to cancel
  }

  const { error } = await svc.auth.admin.deleteUser(user.id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
