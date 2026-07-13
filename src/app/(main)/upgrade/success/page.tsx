import Link from "next/link";
import { Sparkles, ArrowRight, Home } from "lucide-react";
import { stripeClient } from "@/lib/stripe/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export const metadata = { title: "Welcome to Plus · Watchruum" };
export const dynamic = "force-dynamic";

/**
 * Post-checkout thank-you. Stripe redirects here with ?session_id=… . The
 * webhook is the source of truth for the membership, but we also mark the
 * plan-wall as passed here (verified against the paid session) so a slightly
 * delayed webhook can't bounce the member back to /welcome.
 */
export default async function UpgradeSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { session_id } = await searchParams;

  let planLabel = "your membership";
  const stripe = stripeClient();
  if (stripe && session_id) {
    try {
      const session = await stripe.checkout.sessions.retrieve(session_id);
      const plan = session.metadata?.plan;
      if (plan === "founder") planLabel = "Founder";
      else if (plan === "plus") planLabel = "Watchruum Plus";

      // Fallback grant: only if this session is genuinely paid AND belongs to
      // the signed-in user. Written with the service client (members can't
      // self-grant paid tiers). The webhook still reconciles canonical status.
      const paid = session.payment_status === "paid" || session.status === "complete";
      if (paid) {
        const supabase = await createClient();
        const {
          data: { user },
        } = (await supabase?.auth.getUser()) ?? { data: { user: null } };
        const svc = createServiceClient();
        if (user && svc && session.client_reference_id === user.id) {
          await svc.from("memberships").upsert(
            {
              user_id: user.id,
              plan_chosen_at: new Date().toISOString(),
              ...(plan === "plus" || plan === "founder" ? { membership_tier: plan } : {}),
            },
            { onConflict: "user_id" },
          );
        }
      }
    } catch {
      // ignore — the webhook is the source of truth regardless
    }
  }

  return (
    <div className="mx-auto flex max-w-lg flex-col items-center px-4 py-20 text-center md:px-6">
      <span className="grid size-16 place-items-center rounded-2xl bg-gradient-to-br from-primary to-primary-strong text-white shadow-[0_20px_50px_-20px_rgba(124,58,237,0.9)]">
        <Sparkles className="size-8" />
      </span>
      <h1 className="mt-6 text-3xl font-extrabold tracking-tight">You&apos;re in. 🎉</h1>
      <p className="mt-3 text-[15px] leading-relaxed text-muted">
        Welcome to <span className="font-semibold text-foreground">{planLabel}</span>. Your perks are
        unlocking now — ad-free browsing, profile customization, private watch parties, and more.
        It can take a few seconds to appear across the app.
      </p>

      <div className="mt-8 flex w-full flex-col gap-3 sm:flex-row sm:justify-center">
        <Link
          href="/profile"
          className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-primary-strong px-5 py-2.5 text-sm font-bold text-white transition hover:brightness-110"
        >
          Customize your profile <ArrowRight className="size-4" />
        </Link>
        <Link
          href="/"
          className="flex items-center justify-center gap-2 rounded-xl border border-border bg-white/[0.03] px-5 py-2.5 text-sm font-bold text-foreground transition-colors hover:bg-white/[0.06]"
        >
          <Home className="size-4" /> Back to Home
        </Link>
      </div>

      <p className="mt-6 text-[12px] text-muted-2">
        Manage or cancel anytime from Settings. A receipt is on its way to your email.
      </p>
    </div>
  );
}
