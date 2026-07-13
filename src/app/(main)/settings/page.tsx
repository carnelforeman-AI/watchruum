import { SettingsPanel } from "@/components/settings/settings-panel";
import { MembershipCard, type Tier } from "@/components/settings/membership-card";
import { AccountManagement } from "@/components/settings/account-management";
import { createClient } from "@/lib/supabase/server";
import { getLiveMode } from "@/lib/settings";
import { getViewerFlags } from "@/lib/roles";

export const metadata = { title: "Settings · Watchruum" };
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  let isPrivate = false;
  let showActivity = true;
  let language: string | null = null;
  let safety = "strict";
  let notifs = { messages: true, replies: true, likes: true, releases: true, reminders: true, unlocks: true, trending: false };
  // Membership (read separately so a pre-migration column can't break settings).
  let mTier: Tier = "free";
  let mStatus: string | null = null;
  let mBilling: string | null = null;
  let mHasCustomer = false;
  const supabase = await createClient();
  if (supabase) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from("profiles")
        .select("is_private, show_activity, preferred_language, spoiler_safety, notify_messages, notify_replies, notify_likes, notify_releases, notify_reminders, notify_unlocks, notify_trending")
        .eq("id", user.id)
        .maybeSingle();
      const p = data as
        | {
            is_private?: boolean;
            show_activity?: boolean | null;
            preferred_language?: string | null;
            spoiler_safety?: string | null;
            notify_messages?: boolean | null;
            notify_replies?: boolean | null;
            notify_likes?: boolean | null;
            notify_releases?: boolean | null;
            notify_reminders?: boolean | null;
            notify_unlocks?: boolean | null;
            notify_trending?: boolean | null;
          }
        | null;
      isPrivate = !!p?.is_private;
      showActivity = p?.show_activity ?? true; // default on (also handles pre-migration null)
      language = p?.preferred_language ?? null;
      safety = p?.spoiler_safety ?? "strict";
      notifs = {
        messages: p?.notify_messages ?? true,
        replies: p?.notify_replies ?? true,
        likes: p?.notify_likes ?? true,
        releases: p?.notify_releases ?? true,
        reminders: p?.notify_reminders ?? true,
        unlocks: p?.notify_unlocks ?? true,
        trending: p?.notify_trending ?? false,
      };

      // Membership lives in its own owner-readable table (never in the public
      // profiles row). Fault-tolerant: pre-migration this errors → Free.
      const { data: mem } = await supabase
        .from("memberships")
        .select("membership_tier, membership_status, membership_billing, stripe_customer_id")
        .eq("user_id", user.id)
        .maybeSingle();
      const m = mem as
        | {
            membership_tier?: string | null;
            membership_status?: string | null;
            membership_billing?: string | null;
            stripe_customer_id?: string | null;
          }
        | null;
      if (m?.membership_tier === "plus" || m?.membership_tier === "founder") mTier = m.membership_tier;
      mStatus = m?.membership_status ?? null;
      mBilling = m?.membership_billing ?? null;
      mHasCustomer = !!m?.stripe_customer_id;
    }
  }

  // The membership section follows the same "Go Live" switch as /upgrade:
  // hidden from members pre-launch, but admins/testers see it to QA. Anyone
  // already on a paid plan always sees it (so they can manage billing).
  const [live, flags] = await Promise.all([getLiveMode(), getViewerFlags()]);
  const showMembership = live || flags.isAdmin || flags.isTester || mTier !== "free";

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 md:px-6">
      <h1 className="mb-5 text-2xl font-extrabold tracking-tight">Settings</h1>

      {showMembership && (
        <MembershipCard
          tier={mTier}
          status={mStatus}
          billing={mBilling}
          hasCustomer={mHasCustomer}
          isPreview={!live && mTier === "free"}
        />
      )}

      <SettingsPanel
        initialPrivate={isPrivate}
        initialShowActivity={showActivity}
        initialLanguage={language}
        initialSafety={safety}
        initialNotifs={notifs}
      />

      <div className="mt-5">
        <AccountManagement />
      </div>
    </div>
  );
}
