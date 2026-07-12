"use client";

import { useState, useTransition, useEffect } from "react";
import Link from "next/link";
import { X, CalendarClock, Users, Loader2, Check, CalendarPlus, Download } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { scheduleWatch, getInviteableFriends } from "@/app/schedule-actions";
import { downloadICS, googleCalendarUrl, type CalendarEvent } from "@/lib/ics";

interface Friend {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
}

/** Default to the next round hour, formatted for <input type="datetime-local">. */
function defaultWhen(): string {
  const d = new Date();
  d.setMinutes(0, 0, 0);
  d.setHours(d.getHours() + 1);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function ScheduleWatchModal({
  tmdbId,
  mediaType,
  title,
  posterUrl,
  seasonNumber = null,
  episodeNumber = null,
  titleHref,
  onClose,
}: {
  tmdbId: number;
  mediaType: "movie" | "tv";
  title: string;
  posterUrl: string | null;
  seasonNumber?: number | null;
  episodeNumber?: number | null;
  titleHref?: string;
  onClose: () => void;
}) {
  const [when, setWhen] = useState(defaultWhen);
  const [note, setNote] = useState("");
  const [party, setParty] = useState(false);
  const [friends, setFriends] = useState<Friend[] | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<Date | null>(null);
  const [pending, start] = useTransition();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Lazy-load followable friends the first time the party toggle is switched on.
  useEffect(() => {
    if (party && friends === null) {
      getInviteableFriends().then(setFriends).catch(() => setFriends([]));
    }
  }, [party, friends]);

  const epLabel = seasonNumber != null && episodeNumber != null ? ` S${seasonNumber} E${episodeNumber}` : "";
  const fullTitle = `${title}${epLabel}`;

  function toggleFriend(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function submit() {
    setError(null);
    const startAt = new Date(when);
    if (isNaN(startAt.getTime())) return setError("Pick a valid date and time.");
    if (startAt.getTime() < Date.now() - 60_000) return setError("Pick a time in the future.");
    start(async () => {
      const res = await scheduleWatch({
        tmdbId,
        mediaType,
        title,
        posterUrl,
        seasonNumber,
        episodeNumber,
        scheduledAt: startAt.toISOString(),
        note: note.trim() || null,
        inviteeIds: party ? [...selected] : [],
      });
      if (!res.ok && !res.demo) return setError(res.error ?? "Couldn't schedule that.");
      setDone(startAt);
    });
  }

  const calEvent = (): CalendarEvent => ({
    title: `Watch ${fullTitle}`,
    description: [note.trim(), party ? "Watch party on Watchruum" : "Scheduled on Watchruum"].filter(Boolean).join("\n\n"),
    start: done ?? new Date(when),
    url: titleHref ? `https://www.watchruum.com${titleHref}` : undefined,
  });

  return (
    <div className="fixed inset-0 z-[70] grid place-items-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="panel relative z-10 w-full max-w-md overflow-hidden rounded-2xl border border-border shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
          <h2 className="flex items-center gap-2 text-[15px] font-bold">
            <CalendarClock className="size-4 text-primary" /> Schedule a watch
          </h2>
          <button onClick={onClose} aria-label="Close" className="grid size-8 place-items-center rounded-lg text-muted-2 hover:bg-white/5 hover:text-foreground">
            <X className="size-4" />
          </button>
        </div>

        {done ? (
          <div className="p-6 text-center">
            <div className="mx-auto mb-3 grid size-12 place-items-center rounded-full bg-safe/15 text-safe">
              <Check className="size-6" />
            </div>
            <p className="text-[15px] font-bold">You&apos;re set for {fullTitle}</p>
            <p className="mt-1 text-[13px] text-muted-2">
              {done.toLocaleString(undefined, { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
              {party && selected.size > 0 ? ` · ${selected.size} invited` : ""}
            </p>
            <p className="mt-4 text-[12px] font-semibold uppercase tracking-wide text-muted-2">Add to your calendar</p>
            <div className="mt-2 flex flex-col gap-2">
              <a
                href={googleCalendarUrl(calEvent())}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-primary to-primary-strong px-4 py-2.5 text-[13px] font-semibold text-white hover:brightness-110"
              >
                <CalendarPlus className="size-4" /> Add to Google Calendar
              </a>
              <button
                onClick={() => downloadICS(calEvent(), `watchruum-${title.toLowerCase().replace(/\s+/g, "-")}.ics`)}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-border bg-white/[0.03] px-4 py-2.5 text-[13px] font-semibold hover:bg-white/[0.07]"
              >
                <Download className="size-4" /> Download .ics (Apple / Outlook)
              </button>
            </div>
            <p className="mt-3 text-[11.5px] text-muted-2">Adding to your calendar gives you a phone reminder before it starts.</p>
            <div className="mt-4 flex items-center justify-center gap-3">
              <Link href="/schedule" onClick={onClose} className="text-[13px] font-semibold text-primary hover:underline">
                View my schedule
              </Link>
              <button onClick={onClose} className="text-[13px] font-semibold text-muted hover:text-foreground">Done</button>
            </div>
          </div>
        ) : (
          <div className="space-y-4 p-5">
            <div className="flex items-center gap-3">
              <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary ring-1 ring-primary/25">
                <CalendarClock className="size-5" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold">{fullTitle}</p>
                <p className="text-[12px] text-muted-2">{mediaType === "tv" ? "TV" : "Movie"}</p>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-[12px] font-semibold uppercase tracking-wide text-muted-2">When</label>
              <input
                type="datetime-local"
                value={when}
                onChange={(e) => setWhen(e.target.value)}
                className="w-full rounded-xl border border-border bg-white/[0.03] px-3.5 py-2.5 text-sm outline-none focus:border-primary/60 [color-scheme:dark]"
              />
            </div>

            <div>
              <label className="mb-1 block text-[12px] font-semibold uppercase tracking-wide text-muted-2">Note (optional)</label>
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Finally starting this!"
                className="w-full rounded-xl border border-border bg-white/[0.03] px-3.5 py-2.5 text-sm outline-none focus:border-primary/60"
              />
            </div>

            <button
              type="button"
              onClick={() => setParty((p) => !p)}
              className={cn(
                "flex w-full items-center justify-between rounded-xl border px-3.5 py-2.5 text-left transition-colors",
                party ? "border-primary/50 bg-primary/10" : "border-border bg-white/[0.02] hover:bg-white/5",
              )}
            >
              <span className="flex items-center gap-2 text-[13.5px] font-semibold">
                <Users className="size-4 text-primary" /> Make it a watch party
              </span>
              <span className={cn("relative inline-flex h-5 w-9 items-center rounded-full transition-colors", party ? "bg-primary" : "bg-white/15")}>
                <span className={cn("inline-block size-4 rounded-full bg-white shadow transition-transform", party ? "translate-x-4" : "translate-x-0.5")} />
              </span>
            </button>

            {party && (
              <div className="rounded-xl border border-border bg-white/[0.02] p-2">
                {friends === null ? (
                  <div className="grid place-items-center py-4 text-muted-2"><Loader2 className="size-4 animate-spin" /></div>
                ) : friends.length === 0 ? (
                  <p className="px-2 py-3 text-center text-[12.5px] text-muted-2">
                    Follow some friends first — <Link href="/friends" className="font-semibold text-primary hover:underline">find friends</Link>.
                  </p>
                ) : (
                  <div className="max-h-44 space-y-1 overflow-y-auto no-scrollbar">
                    {friends.map((f) => {
                      const on = selected.has(f.id);
                      return (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => toggleFriend(f.id)}
                          className={cn("flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors", on ? "bg-primary/15" : "hover:bg-white/5")}
                        >
                          <Avatar name={f.display_name} src={f.avatar_url} size="sm" />
                          <span className="min-w-0 flex-1 truncate text-[13px] font-medium">{f.display_name}</span>
                          <span className={cn("grid size-5 place-items-center rounded-full border", on ? "border-primary bg-primary text-white" : "border-muted-2")}>
                            {on && <Check className="size-3" />}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {error && <p className="text-[12.5px] font-medium text-danger">{error}</p>}

            <button
              onClick={submit}
              disabled={pending}
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-primary to-primary-strong px-4 py-2.5 text-[13.5px] font-semibold text-white hover:brightness-110 disabled:opacity-60"
            >
              {pending ? <Loader2 className="size-4 animate-spin" /> : <CalendarClock className="size-4" />}
              {party && selected.size > 0 ? `Schedule & invite ${selected.size}` : "Schedule watch"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
