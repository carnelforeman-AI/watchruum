"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, Bell, LogOut } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

const SAFETY = [
  { value: "strict", label: "Strict", desc: "Hide everything beyond my progress. Recommended." },
  { value: "balanced", label: "Balanced", desc: "Blur spoilers but let me peek with one click." },
  { value: "off", label: "Off", desc: "Show everything. I like living dangerously." },
];

function Toggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn("relative h-6 w-11 rounded-full transition-colors", on ? "bg-primary" : "bg-white/15")}
    >
      <span className={cn("absolute top-0.5 size-5 rounded-full bg-white transition-transform", on ? "translate-x-5" : "translate-x-0.5")} />
    </button>
  );
}

export function SettingsPanel() {
  const router = useRouter();
  const supabase = createClient();
  const [safety, setSafety] = useState("strict");
  const [notifs, setNotifs] = useState({ replies: true, likes: true, unlocks: true, trending: false });

  async function signOut() {
    if (supabase) await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="space-y-5">
      <Card className="p-5">
        <div className="mb-4 flex items-center gap-2">
          <ShieldCheck className="size-4 text-primary" />
          <h2 className="font-semibold">Spoiler safety</h2>
        </div>
        <div className="space-y-2">
          {SAFETY.map((s) => (
            <button
              key={s.value}
              onClick={() => setSafety(s.value)}
              className={cn(
                "flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-colors",
                safety === s.value ? "border-primary/50 bg-primary/10" : "border-border bg-white/[0.02] hover:bg-white/5",
              )}
            >
              <span className={cn("mt-0.5 grid size-4 place-items-center rounded-full border", safety === s.value ? "border-primary" : "border-muted-2")}>
                {safety === s.value && <span className="size-2 rounded-full bg-primary" />}
              </span>
              <span>
                <span className="block text-sm font-semibold">{s.label}</span>
                <span className="block text-[12px] text-muted-2">{s.desc}</span>
              </span>
            </button>
          ))}
        </div>
      </Card>

      <Card className="p-5">
        <div className="mb-4 flex items-center gap-2">
          <Bell className="size-4 text-primary" />
          <h2 className="font-semibold">Notifications</h2>
        </div>
        <div className="space-y-3">
          {([
            ["replies", "Replies to my posts"],
            ["likes", "Likes on my reviews"],
            ["unlocks", "When discussions unlock"],
            ["trending", "Trending room alerts"],
          ] as const).map(([key, label]) => (
            <div key={key} className="flex items-center justify-between">
              <span className="text-sm">{label}</span>
              <Toggle on={notifs[key]} onClick={() => setNotifs((n) => ({ ...n, [key]: !n[key] }))} />
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="mb-1 font-semibold">Account</h2>
        <p className="mb-4 text-[13px] text-muted">Sign out of Watchruum on this device.</p>
        <Button variant="danger" onClick={signOut}>
          <LogOut /> Sign out
        </Button>
      </Card>
    </div>
  );
}
