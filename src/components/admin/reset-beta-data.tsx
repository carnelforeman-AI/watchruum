"use client";

import { useState, useTransition } from "react";
import { Trash2, AlertTriangle, Loader2, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { resetBetaData } from "@/app/admin/settings-actions";

const CLEARS = [
  "reviews",
  "comments",
  "actor comments",
  "reactions / likes",
  "ratings",
  "watch progress & watchlist",
  "episode watch log",
  "title alerts",
  "notifications",
  "reports",
  "follows",
];

const NICE: Record<string, string> = {
  reactions: "reactions",
  person_comments: "actor comments",
  comments: "comments",
  reviews: "reviews",
  ratings: "ratings",
  episode_watches: "episode watches",
  watch_status: "watch progress",
  title_alerts: "title alerts",
  notifications: "notifications",
  reports: "reports",
  follows: "follows",
};

/**
 * Danger Zone: wipe beta activity for a fresh start. Two-step and phrase-gated
 * (must type RESET). Keeps all member accounts — only clears their activity.
 */
export function ResetBetaData() {
  const [open, setOpen] = useState(false);
  const [phrase, setPhrase] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<Record<string, number | null> | null>(null);
  const [pending, startTransition] = useTransition();

  const armed = phrase.trim().toUpperCase() === "RESET";

  const run = () => {
    if (!armed) return;
    setError(null);
    startTransition(async () => {
      const res = await resetBetaData("RESET");
      if (res.ok) {
        setDone(res.cleared ?? {});
        setOpen(false);
        setPhrase("");
      } else {
        setError(res.error ?? "Something went wrong.");
      }
    });
  };

  const total = done
    ? Object.values(done).reduce<number>((s, v) => s + (v ?? 0), 0)
    : 0;

  return (
    <div className="rounded-2xl border border-danger/40 bg-danger/[0.04] p-5">
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-danger/15 text-danger ring-1 ring-danger/30">
          <AlertTriangle className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold text-danger">Danger Zone</h3>
          <p className="mt-1 text-[12.5px] leading-relaxed text-muted">
            Clear all beta testing activity for a fresh start. Member accounts stay — this only wipes their
            content and activity. This cannot be undone.
          </p>
        </div>
      </div>

      {done && (
        <div className="mt-3 rounded-xl border border-safe/40 bg-safe/[0.06] p-3">
          <p className="flex items-center gap-1.5 text-[13px] font-semibold text-safe">
            <CheckCircle2 className="size-4" /> Beta data cleared — {total.toLocaleString()} row
            {total === 1 ? "" : "s"} removed.
          </p>
          <p className="mt-1 text-[12px] text-muted">
            {Object.entries(done)
              .filter(([, v]) => (v ?? 0) > 0)
              .map(([k, v]) => `${v} ${NICE[k] ?? k}`)
              .join(" · ") || "Nothing to remove — already clean."}
          </p>
        </div>
      )}

      {error && (
        <p className="mt-3 flex items-center gap-1.5 rounded-lg bg-danger/10 px-3 py-2 text-[12px] font-medium text-danger">
          <AlertTriangle className="size-3.5" /> {error}
        </p>
      )}

      {!open ? (
        <button
          type="button"
          onClick={() => {
            setDone(null);
            setError(null);
            setOpen(true);
          }}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-danger/50 bg-danger/10 px-4 py-2.5 text-sm font-bold text-danger transition-colors hover:bg-danger/20"
        >
          <Trash2 className="size-4" /> Reset beta data…
        </button>
      ) : (
        <div className="mt-4 rounded-xl border border-danger/40 bg-white/[0.02] p-3">
          <p className="text-[13px] font-semibold">This permanently deletes:</p>
          <p className="mt-1 text-[12px] leading-relaxed text-muted">{CLEARS.join(" · ")}.</p>
          <p className="mt-2 text-[12px] text-muted">
            Kept: all member accounts &amp; profiles, avatars, TMDb data, and your Live Mode setting.
          </p>

          <label className="mt-3 block text-[12px] font-semibold text-muted">
            Type <span className="font-mono font-bold text-danger">RESET</span> to confirm
          </label>
          <input
            value={phrase}
            onChange={(e) => setPhrase(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") run();
            }}
            placeholder="RESET"
            autoComplete="off"
            spellCheck={false}
            className="mt-1.5 w-full rounded-lg border border-border bg-white/[0.03] px-3 py-2 font-mono text-[13px] outline-none transition focus:border-danger/60"
          />

          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={run}
              disabled={!armed || pending}
              className={cn(
                "flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-[13px] font-bold text-white transition-colors",
                armed && !pending ? "bg-danger hover:bg-danger/90" : "cursor-not-allowed bg-danger/40",
              )}
            >
              {pending ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Clearing…
                </>
              ) : (
                <>
                  <Trash2 className="size-4" /> Permanently clear
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setPhrase("");
                setError(null);
              }}
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
