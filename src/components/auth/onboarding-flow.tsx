"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

const GENRES = [
  "Drama", "Sci-Fi", "Thriller", "Fantasy", "Crime", "Comedy",
  "Horror", "Mystery", "Romance", "Action", "Documentary", "Reality",
];

export function OnboardingFlow() {
  const router = useRouter();
  const supabase = createClient();
  const [step, setStep] = useState(1);
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [genres, setGenres] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function toggle(g: string) {
    setGenres((cur) => (cur.includes(g) ? cur.filter((x) => x !== g) : [...cur, g]));
  }

  async function finish() {
    setErr(null);
    if (!supabase) {
      router.push("/");
      return;
    }
    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }
      const { error } = await supabase
        .from("profiles")
        .update({
          display_name: displayName || username,
          username,
          favorite_genres: genres,
          onboarded: true,
        })
        .eq("id", user.id);
      if (error) throw error;
      router.push("/");
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not save profile.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="p-6">
      <div className="mb-5 flex items-center gap-2">
        {[1, 2].map((s) => (
          <div
            key={s}
            className={cn("h-1.5 flex-1 rounded-full", s <= step ? "bg-primary" : "bg-white/10")}
          />
        ))}
      </div>

      {step === 1 ? (
        <>
          <h1 className="text-2xl font-bold tracking-tight">Create your profile</h1>
          <p className="mt-1 text-sm text-muted">This is how other fans will see you.</p>
          <div className="mt-5 space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-[13px] font-semibold">Display name</span>
              <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Alex Morgan" />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[13px] font-semibold">Username</span>
              <div className="relative">
                <span className="absolute left-3 top-2 text-sm text-muted-2">@</span>
                <Input value={username} onChange={(e) => setUsername(e.target.value.replace(/\s/g, ""))} placeholder="alexm" className="pl-7" />
              </div>
            </label>
          </div>
          <Button
            className="mt-6 w-full"
            size="lg"
            disabled={!username.trim()}
            onClick={() => setStep(2)}
          >
            Continue
          </Button>
        </>
      ) : (
        <>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <Sparkles className="size-5 text-primary" /> Pick your genres
          </h1>
          <p className="mt-1 text-sm text-muted">We&apos;ll tune your rooms and recommendations.</p>
          <div className="mt-5 flex flex-wrap gap-2">
            {GENRES.map((g) => {
              const on = genres.includes(g);
              return (
                <button
                  key={g}
                  onClick={() => toggle(g)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-[13px] font-medium transition-colors",
                    on
                      ? "border-primary/50 bg-primary/15 text-foreground"
                      : "border-border bg-white/5 text-muted hover:text-foreground",
                  )}
                >
                  {on && <Check className="size-3.5" />}
                  {g}
                </button>
              );
            })}
          </div>
          {err && <p className="mt-4 text-[13px] text-danger">{err}</p>}
          <div className="mt-6 flex gap-3">
            <Button variant="secondary" size="lg" onClick={() => setStep(1)}>
              Back
            </Button>
            <Button className="flex-1" size="lg" onClick={finish} disabled={loading}>
              {loading && <Loader2 className="animate-spin" />} Enter Watchruum
            </Button>
          </div>
        </>
      )}
    </Card>
  );
}
