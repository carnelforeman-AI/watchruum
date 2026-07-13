import { redirect } from "next/navigation";
import { Eye } from "lucide-react";
import { WatchruumLogo } from "@/components/layout/logo";
import { Pricing } from "@/components/upgrade/pricing";
import { createClient } from "@/lib/supabase/server";
import { getLiveMode } from "@/lib/settings";

export const metadata = { title: "Choose your plan · Watchruum" };
export const dynamic = "force-dynamic";

/**
 * The "choose a plan" wall. New members land here after onboarding and must
 * pick a plan before the app opens. Enforced (via src/proxy.ts) only once Live
 * Mode is on, so beta testers aren't blocked. Admins & testers can preview it
 * anytime; everyone who has already chosen is sent into the app.
 */
export default async function WelcomePage() {
  const supabase = await createClient();
  if (!supabase) redirect("/");

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data }, { data: mem }] = await Promise.all([
    supabase.from("profiles").select("onboarded, is_admin, is_tester").eq("id", user.id).maybeSingle(),
    supabase.from("memberships").select("plan_chosen_at").eq("user_id", user.id).maybeSingle(),
  ]);
  const p = data as { onboarded?: boolean; is_admin?: boolean; is_tester?: boolean } | null;

  // Onboarding always comes first.
  if (!p?.onboarded) redirect("/onboarding");

  const live = await getLiveMode();
  const preview = !!p?.is_admin || !!p?.is_tester;
  const chosen = !!(mem as { plan_chosen_at?: string | null } | null)?.plan_chosen_at;

  // Already chose, or the wall isn't active yet — no reason to sit here
  // (admins/testers may still preview).
  if ((chosen || !live) && !preview) redirect("/");

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/4 top-0 size-[520px] rounded-full bg-primary/20 blur-[130px]" />
        <div className="absolute bottom-0 right-1/5 size-[420px] rounded-full bg-accent/15 blur-[130px]" />
      </div>

      <header className="flex items-center justify-between px-5 py-5 md:px-8">
        <WatchruumLogo />
        <span className="text-[12px] text-muted-2">Pick a plan to enter</span>
      </header>

      {preview && (chosen || !live) && (
        <div className="mx-auto max-w-6xl px-4 md:px-6">
          <div className="flex items-center gap-2.5 rounded-xl border border-warn/25 bg-warn/[0.07] px-4 py-2.5 text-[12.5px] font-medium text-warn">
            <Eye className="size-4 shrink-0" />
            <span>
              <strong className="font-bold">Preview.</strong> This wall is shown to members only after
              Go Live{chosen ? " — you’ve already chosen a plan" : ""}.
            </span>
          </div>
        </div>
      )}

      <Pricing mode="wall" signedIn />
    </div>
  );
}
