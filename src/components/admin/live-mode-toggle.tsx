"use client";

import { useState, useTransition } from "react";
import { Rocket, FlaskConical, Loader2, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { setLiveMode } from "@/app/admin/settings-actions";

/**
 * The "Go Live" switch. Reversible: flip ON for real, 0-based counts across
 * the app (title tracking, watch-room activity, leaderboard), or OFF to show
 * the seeded demo numbers again. Asks for confirmation before switching.
 */
export function LiveModeToggle({ initialLive }: { initialLive: boolean }) {
  const [live, setLive] = useState(initialLive);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const apply = (next: boolean) => {
    setError(null);
    startTransition(async () => {
      const res = await setLiveMode(next);
      if (res.ok) {
        setLive(res.live ?? next);
        setConfirming(false);
      } else {
        setError(res.error ?? "Something went wrong.");
      }
    });
  };

  return (
    <div className="glass rounded-2xl border border-border-soft p-5">
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "grid size-10 shrink-0 place-items-center rounded-xl ring-1",
            live
              ? "bg-safe/15 text-safe ring-safe/30"
              : "bg-warn/15 text-warn ring-warn/30",
          )}
        >
          {live ? <Rocket className="size-5" /> : <FlaskConical className="size-5" />}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold">
              {live ? "Live Mode" : "Demo Mode"}
            </h3>
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide",
                live ? "bg-safe/20 text-safe" : "bg-warn/20 text-warn",
              )}
            >
              {live ? "Real numbers" : "Seeded demo"}
            </span>
          </div>
          <p className="mt-1 text-[12.5px] leading-relaxed text-muted">
            {live
              ? "Every count is real — each new action adds +1. Title tracking, watch-room activity and the leaderboard all reflect actual members."
              : "Showing seeded demo numbers so the app looks alive pre-launch. Go live to switch to real, 0-based counts everywhere."}
          </p>
        </div>
      </div>

      {error && (
        <p className="mt-3 flex items-center gap-1.5 rounded-lg bg-danger/10 px-3 py-2 text-[12px] font-medium text-danger">
          <AlertTriangle className="size-3.5" /> {error}
        </p>
      )}

      {!confirming ? (
        <button
          type="button"
          onClick={() => {
            setError(null);
            setConfirming(true);
          }}
          disabled={pending}
          className={cn(
            "mt-4 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-colors",
            live
              ? "border border-border bg-white/[0.03] text-muted hover:text-foreground"
              : "bg-gradient-to-r from-primary to-primary-strong text-white hover:opacity-90",
          )}
        >
          {live ? (
            <>
              <FlaskConical className="size-4" /> Switch back to Demo Mode
            </>
          ) : (
            <>
              <Rocket className="size-4" /> Go Live
            </>
          )}
        </button>
      ) : (
        <div className="mt-4 rounded-xl border border-border bg-white/[0.03] p-3">
          <p className="text-[13px] font-semibold">
            {live
              ? "Switch back to seeded demo numbers?"
              : "Go live with real numbers?"}
          </p>
          <p className="mt-1 text-[12px] text-muted">
            {live
              ? "Counts will show seeded demo values again. You can flip back anytime."
              : "All counts reset to real values (0 until members act). Fully reversible."}
          </p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => apply(!live)}
              disabled={pending}
              className={cn(
                "flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-[13px] font-bold text-white transition-colors",
                live ? "bg-warn hover:bg-warn/90" : "bg-safe hover:bg-safe/90",
              )}
            >
              {pending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : live ? (
                "Yes, use demo numbers"
              ) : (
                "Yes, go live"
              )}
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              disabled={pending}
              className="rounded-lg border border-border px-3 py-2 text-[13px] font-semibold text-muted transition-colors hover:text-foreground"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
