"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mail, Lock, Loader2, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
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
          // Email confirmation is off — the user is signed in immediately.
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

  return (
    <Card className="p-6">
      <h1 className="text-2xl font-bold tracking-tight">
        {isSignup ? "Create your account" : "Welcome back"}
      </h1>
      <p className="mt-1 text-sm text-muted">
        {isSignup ? "Start tracking spoiler-safe." : "Sign in to pick up where you left off."}
      </p>

      {!supabase && (
        <div className="mt-4 flex items-start gap-2 rounded-xl border border-accent/40 bg-accent/10 p-3 text-[12px] text-accent">
          <Info className="mt-0.5 size-4 shrink-0" />
          <span>
            Demo mode — Supabase isn&apos;t connected yet. Continue to explore the app with
            sample data.
          </span>
        </div>
      )}

      <form onSubmit={submit} className="mt-5 space-y-3">
        <div className="relative">
          <Mail className="pointer-events-none absolute left-3 top-3 size-4 text-muted-2" />
          <Input
            type="email"
            required={!!supabase}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@email.com"
            className="pl-10"
          />
        </div>
        <div className="relative">
          <Lock className="pointer-events-none absolute left-3 top-3 size-4 text-muted-2" />
          <Input
            type="password"
            required={!!supabase}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="pl-10"
          />
        </div>
        <Button type="submit" className="w-full" size="lg" disabled={loading}>
          {loading && <Loader2 className="animate-spin" />}
          {supabase ? (isSignup ? "Create account" : "Sign in") : "Continue in demo mode"}
        </Button>
      </form>

      {msg && <p className="mt-3 text-center text-[13px] text-muted">{msg}</p>}

      <p className="mt-5 text-center text-[13px] text-muted">
        {isSignup ? "Already have an account? " : "New to Watchruum? "}
        <Link href={isSignup ? "/login" : "/signup"} className="font-semibold text-primary hover:underline">
          {isSignup ? "Sign in" : "Create one"}
        </Link>
      </p>
    </Card>
  );
}
