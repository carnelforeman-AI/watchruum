import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** OAuth / email confirmation callback: exchange the code for a session. */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next");

  if (code) {
    const supabase = await createClient();
    if (supabase) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) {
        // Respect an explicit ?next=. Otherwise send brand-new (not-yet
        // onboarded) users to onboarding, and everyone else straight home —
        // logging back in must NOT re-trigger onboarding.
        let dest = next || "/";
        if (!next) {
          const {
            data: { user },
          } = await supabase.auth.getUser();
          if (user) {
            const { data: prof } = await supabase
              .from("profiles")
              .select("onboarded")
              .eq("id", user.id)
              .maybeSingle();
            dest = (prof as { onboarded?: boolean } | null)?.onboarded ? "/" : "/onboarding";
          }
        }
        return NextResponse.redirect(`${origin}${dest}`);
      }
    }
  }
  return NextResponse.redirect(`${origin}/login`);
}
