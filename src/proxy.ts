import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { SUPABASE_URL, SUPABASE_ANON_KEY, isSupabaseConfigured } from "@/lib/supabase/config";

/**
 * Next.js 16 "proxy" (formerly middleware). Refreshes the Supabase auth
 * session cookie on each request. No-op when Supabase isn't configured.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  if (!isSupabaseConfigured) return response;

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  // Touch the session so cookies stay fresh.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isAuthRoute = pathname === "/login" || pathname === "/signup";
  // Public pages: auth, invite-accept (no account yet), and legal pages.
  const isLegal =
    pathname.startsWith("/privacy") || pathname.startsWith("/terms") || pathname.startsWith("/cookies");
  // SEO / social crawler assets must be reachable WITHOUT the login gate —
  // otherwise Facebook/Twitter/Google fetch the login page instead of the
  // Open Graph image, icons, robots.txt, or sitemap (link previews come back
  // blank, and search engines can't crawl).
  const isCrawlerAsset =
    pathname.startsWith("/opengraph-image") ||
    pathname.startsWith("/twitter-image") ||
    pathname.startsWith("/icon") ||
    pathname.startsWith("/apple-icon") ||
    pathname === "/manifest.webmanifest" ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml";
  const isPublic =
    isAuthRoute || pathname.startsWith("/auth") || pathname.startsWith("/join") || isLegal || isCrawlerAsset;

  // Gate the app: unauthenticated users can only reach the auth pages.
  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }

  // Signed-in users shouldn't sit on the login / signup screens.
  if (user && isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }

  // Membership wall: once Live Mode is on, members must choose a plan before
  // the app opens. Onboarding runs first; admins/testers are exempt so they
  // can move around and QA. Pre-launch (demo mode) this is a single extra
  // read; it only touches the profile once we're actually live.
  if (user) {
    const wallExempt =
      pathname.startsWith("/welcome") ||
      pathname === "/onboarding" ||
      pathname.startsWith("/upgrade/success") ||
      pathname.startsWith("/api") ||
      pathname.startsWith("/auth") ||
      pathname.startsWith("/join") ||
      isLegal ||
      pathname === "/suspended";

    if (!wallExempt) {
      const { data: settings } = await supabase
        .from("app_settings")
        .select("live_mode")
        .eq("id", 1)
        .maybeSingle();
      const live = Boolean((settings as { live_mode?: boolean } | null)?.live_mode);

      if (live) {
        const [{ data: prof }, { data: mem }] = await Promise.all([
          supabase.from("profiles").select("onboarded, is_admin, is_tester").eq("id", user.id).maybeSingle(),
          supabase.from("memberships").select("plan_chosen_at").eq("user_id", user.id).maybeSingle(),
        ]);
        const pr = prof as { onboarded?: boolean; is_admin?: boolean; is_tester?: boolean } | null;
        const chosen = !!(mem as { plan_chosen_at?: string | null } | null)?.plan_chosen_at;
        const privileged = !!pr?.is_admin || !!pr?.is_tester;

        if (pr?.onboarded && !chosen && !privileged) {
          const url = request.nextUrl.clone();
          url.pathname = "/welcome";
          url.search = "";
          return NextResponse.redirect(url);
        }
      }
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
