import { redirect } from "next/navigation";
import { Ban, ShieldAlert } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { WatchruumLogo } from "@/components/layout/logo";

export const metadata = { title: "Account restricted · Watchruum" };
export const dynamic = "force-dynamic";

export default async function SuspendedPage() {
  const supabase = await createClient();
  let status: string | undefined;
  let reason: string | null = null;

  if (supabase) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect("/login");
    const { data } = await supabase
      .from("profiles")
      .select("status, status_reason")
      .eq("id", user!.id)
      .maybeSingle();
    status = (data as { status?: string } | null)?.status;
    reason = (data as { status_reason?: string | null } | null)?.status_reason ?? null;
  }

  // Not actually restricted → nothing to see here.
  if (status !== "banned" && status !== "suspended") redirect("/");

  const banned = status === "banned";

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4">
      <div className="absolute inset-0 -z-10">
        <div className="absolute left-1/3 top-0 size-[500px] rounded-full bg-danger/15 blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 size-[400px] rounded-full bg-primary/10 blur-[120px]" />
      </div>

      <div className="w-full max-w-md text-center">
        <div className="mb-6 flex justify-center">
          <WatchruumLogo />
        </div>

        <div className="glass rounded-3xl p-8">
          <span className="mx-auto mb-4 grid size-14 place-items-center rounded-2xl bg-danger/15 text-danger ring-1 ring-danger/30">
            {banned ? <Ban className="size-7" /> : <ShieldAlert className="size-7" />}
          </span>
          <h1 className="text-2xl font-extrabold tracking-tight">
            {banned ? "Account banned" : "Account suspended"}
          </h1>
          <p className="mt-2 text-[14px] leading-relaxed text-muted">
            {banned
              ? "Your account has been banned and you no longer have access to Watchruum."
              : "Your account is temporarily suspended, so access is paused for now."}
          </p>

          {reason && (
            <div className="mt-4 rounded-xl border border-border bg-white/[0.03] p-3 text-left">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-2">Reason</p>
              <p className="mt-1 text-[13px] text-foreground/90">{reason}</p>
            </div>
          )}

          <p className="mt-4 text-[12px] text-muted-2">
            If you think this is a mistake, reach out to the Watchruum team.
          </p>

          <div className="mt-6 flex justify-center">
            <SignOutButton />
          </div>
        </div>
      </div>
    </div>
  );
}
