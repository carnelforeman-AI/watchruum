import { redirect } from "next/navigation";
import { OnboardingFlow } from "@/components/auth/onboarding-flow";
import { WatchruumLogo } from "@/components/layout/logo";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Set up your profile · Watchruum" };
export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  // Only genuinely new accounts should see onboarding. Anyone already set up
  // (or not signed in) gets bounced — logging back in must never re-register.
  const supabase = await createClient();
  if (supabase) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect("/login");
    const { data: prof } = await supabase
      .from("profiles")
      .select("onboarded")
      .eq("id", user!.id)
      .maybeSingle();
    if ((prof as { onboarded?: boolean } | null)?.onboarded) redirect("/");
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
      <div className="absolute inset-0 -z-10">
        <div className="absolute left-1/3 top-0 size-[500px] rounded-full bg-primary/20 blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 size-[400px] rounded-full bg-accent/15 blur-[120px]" />
      </div>
      <div className="w-full max-w-lg">
        <div className="mb-6 flex justify-center">
          <WatchruumLogo />
        </div>
        <OnboardingFlow />
      </div>
    </div>
  );
}
