"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { User, Lock, Loader2, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<"google" | "apple" | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const isSignup = mode === "signup";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);

    // Demo mode — Supabase not configured.
    if (!supabase) {
      router.push(isSignup ? "/onboarding" : "/");
      return;
    }

    setLoading(true);
    try {
      if (isSignup) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${location.origin}/auth/callback` },
        });
        if (error) throw error;
        if (data.session) {
          router.push("/onboarding");
          router.refresh();
        } else {
          setMsg("Check your email to confirm, then sign in to finish your profile.");
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push("/");
        router.refresh();
      }
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  async function oauth(provider: "google" | "apple") {
    setMsg(null);
    if (!supabase) {
      router.push(isSignup ? "/onboarding" : "/");
      return;
    }
    setOauthLoading(provider);
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${location.origin}/auth/callback` },
    });
    if (error) {
      setOauthLoading(null);
      setMsg(
        `${provider === "google" ? "Google" : "Apple"} sign-in isn't enabled yet. Use email for now.`,
      );
    }
  }

  return (
    <div className="w-full max-w-[420px]">
      <div className="glass rounded-3xl p-7 sm:p-8">
        <h1 className="text-3xl font-extrabold tracking-tight">
          {isSignup ? (
            <>
              Create <span className="brand-gradient">account</span>
            </>
          ) : (
            <>
              Welcome <span className="brand-gradient">back</span>
            </>
          )}
        </h1>
        <p className="mt-1.5 text-sm text-muted">
          {isSignup ? "Join Watchruum to start watching spoiler-safe." : "Sign in to continue to Watchruum."}
        </p>

        <form onSubmit={submit} className="mt-6 space-y-4">
          <div>
            <label className="mb-1.5 block text-[13px] font-semibold text-foreground/90">
              Email {isSignup ? "" : "or username"}
            </label>
            <div className="relative">
              <User className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-2" />
              <Input
                type="email"
                required={!!supabase}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@email.com"
                className="h-12 pl-11"
                autoComplete="email"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-[13px] font-semibold text-foreground/90">
              Password
            </label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-2" />
              <Input
                type={showPw ? "text" : "password"}
                required={!!supabase}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="h-12 pl-11 pr-11"
                autoComplete={isSignup ? "new-password" : "current-password"}
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-2 transition-colors hover:text-foreground"
                aria-label={showPw ? "Hide password" : "Show password"}
              >
                {showPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>

          {!isSignup && (
            <div className="flex justify-end">
              <Link href="/login" className="text-[13px] font-semibold text-primary hover:underline">
                Forgot password?
              </Link>
            </div>
          )}

          <Button type="submit" className="h-12 w-full text-base" size="lg" disabled={loading}>
            {loading && <Loader2 className="animate-spin" />}
            {supabase ? (isSignup ? "Create account" : "Sign in") : "Continue in demo mode"}
          </Button>
        </form>

        <div className="my-5 flex items-center gap-3 text-[12px] text-muted-2">
          <span className="h-px flex-1 bg-border" />
          or continue with
          <span className="h-px flex-1 bg-border" />
        </div>

        <div className="space-y-3">
          <button
            type="button"
            onClick={() => oauth("google")}
            disabled={!!oauthLoading}
            className="flex h-12 w-full items-center justify-center gap-2.5 rounded-xl border border-border bg-white/[0.03] text-sm font-semibold transition-colors hover:bg-white/[0.07] disabled:opacity-60"
          >
            {oauthLoading === "google" ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <GoogleIcon />
            )}
            Continue with Google
          </button>
          <button
            type="button"
            onClick={() => oauth("apple")}
            disabled={!!oauthLoading}
            className="flex h-12 w-full items-center justify-center gap-2.5 rounded-xl border border-border bg-white/[0.03] text-sm font-semibold transition-colors hover:bg-white/[0.07] disabled:opacity-60"
          >
            {oauthLoading === "apple" ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <AppleIcon />
            )}
            Continue with Apple
          </button>
        </div>

        {msg && <p className="mt-4 text-center text-[13px] text-muted">{msg}</p>}

        <p className="mt-6 text-center text-[13px] text-muted">
          {isSignup ? "Already have an account? " : "New to Watchruum? "}
          <Link
            href={isSignup ? "/login" : "/signup"}
            className="font-semibold text-primary hover:underline"
          >
            {isSignup ? "Sign in" : "Create an account"}
          </Link>
        </p>
      </div>

      <p className="mt-4 flex items-center justify-center gap-1.5 text-[12px] text-muted-2">
        <ShieldCheck className="size-3.5" /> We respect your privacy. Your data is safe with us.
      </p>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.56c2.08-1.92 3.28-4.74 3.28-8.09Z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.76c-.98.66-2.24 1.06-3.72 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z" />
      <path fill="#FBBC05" d="M5.84 14.11a6.6 6.6 0 0 1 0-4.22V7.05H2.18a11 11 0 0 0 0 9.9l3.66-2.84Z" />
      <path fill="#EA4335" d="M12 4.75c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 1.46 14.97.5 12 .5A11 11 0 0 0 2.18 7.05l3.66 2.84c.87-2.6 3.3-4.14 6.16-4.14Z" />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4 fill-white">
      <path d="M17.05 12.54c-.02-1.9 1.55-2.81 1.62-2.86-.88-1.29-2.26-1.47-2.75-1.49-1.17-.12-2.29.69-2.88.69-.6 0-1.51-.67-2.49-.65-1.28.02-2.46.74-3.12 1.89-1.33 2.31-.34 5.72.96 7.59.64.92 1.4 1.95 2.39 1.91.96-.04 1.32-.62 2.48-.62 1.15 0 1.48.62 2.49.6 1.03-.02 1.68-.94 2.31-1.86.73-1.07 1.03-2.1 1.05-2.16-.02-.01-2.01-.78-2.03-3.08ZM15.16 6.9c.53-.64.89-1.53.79-2.42-.76.03-1.69.51-2.24 1.15-.49.56-.92 1.47-.81 2.33.85.07 1.72-.43 2.26-1.06Z" />
    </svg>
  );
}
