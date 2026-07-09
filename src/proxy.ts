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
  const isPublic = isAuthRoute || pathname.startsWith("/auth");

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

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
