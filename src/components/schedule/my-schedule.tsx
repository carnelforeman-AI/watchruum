"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { CalendarClock, Users, Trash2, Check, X, HelpCircle, CalendarPlus, Download, Loader2 } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Poster } from "@/components/media/poster";
import { rsvpWatch, cancelScheduledWatch } from "@/app/schedule-actions";
import { downloadICS, googleCalendarUrl, type CalendarEvent } from "@/lib/ics";
import type { ScheduledWatch } from "@/lib/schedule";

function whenLabel(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function eventFor(w: ScheduledWatch): CalendarEvent {
  const ep = w.season_number != null && w.episode_number != null ? ` S${w.season_number} E${w.episode_number}` : "";
  return {
    title: `Watch ${w.title}${ep}`,
    description: [w.note ?? "", w.is_party ? "Watch party on Watchruum" : "Scheduled on Watchruum"].filter(Boolean).join("\n\n"),
    start: new Date(w.scheduled_at),
    url: `https://www.watchruum.com/title/${w.titleId}`,
  };
}

export function MySchedule({ initialUpcoming, initialInvites }: { initialUpcoming: ScheduledWatch[]; initialInvites: ScheduledWatch[] }) {
  const [upcoming, setUpcoming] = useState(initialUpcoming);
  const [invites, setInvites] = useState(initialInvites);

  function onRsvp(w: ScheduledWatch, status: "going" | "maybe" | "declined") {
    setInvites((prev) => prev.filter((x) => x.id !== w.id));
    if (status === "going" || status === "maybe") setUpcoming((prev) => [...prev, { ...w, myRsvp: status }].sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at)));
  }
  function onCancel(id: string) {
    setUpcoming((prev) => prev.filter((x) => x.id !== id));
  }

  const empty = upcoming.length === 0 && invites.length === 0;

  return (
    <div className="space-y-6">
      {invites.length > 0 && (
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-[15px] font-bold">
            <Users className="size-4 text-primary" /> Watch party invites
          </h2>
          <div className="space-y-3">
            {invites.map((w) => (
              <InviteCard key={w.id} w={w} onRsvp={onRsvp} />
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-3 flex items-center gap-2 text-[15px] font-bold">
          <CalendarClock className="size-4 text-primary" /> Upcoming
        </h2>
        {upcoming.length === 0 ? (
          <div className="glass grid place-items-center rounded-2xl py-12 text-center">
            <CalendarClock className="mb-2 size-8 text-muted-2" />
            <p className="font-semibold">Nothing scheduled yet</p>
            <p className="mt-1 max-w-xs text-[13px] text-muted-2">
              Open any show or movie and hit <span className="font-semibold text-foreground">Schedule watch</span> to plan when you&apos;ll watch — solo or with friends.
            </p>
            {!empty ? null : (
              <Link href="/trending" className="mt-4 text-[13px] font-semibold text-primary hover:underline">Browse something to watch</Link>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {upcoming.map((w) => (
              <UpcomingCard key={w.id} w={w} onCancel={onCancel} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function ExportButtons({ w }: { w: ScheduledWatch }) {
  return (
    <div className="flex items-center gap-2">
      <a
        href={googleCalendarUrl(eventFor(w))}
        target="_blank"
        rel="noopener noreferrer"
        title="Add to Google Calendar"
        className="inline-flex items-center gap-1 rounded-lg border border-border bg-white/[0.03] px-2.5 py-1.5 text-[12px] font-semibold hover:bg-white/[0.07]"
      >
        <CalendarPlus className="size-3.5" /> Google
      </a>
      <button
        onClick={() => downloadICS(eventFor(w), `watchruum-${w.title.toLowerCase().replace(/\s+/g, "-")}.ics`)}
        title="Download .ics"
        className="inline-flex items-center gap-1 rounded-lg border border-border bg-white/[0.03] px-2.5 py-1.5 text-[12px] font-semibold hover:bg-white/[0.07]"
      >
        <Download className="size-3.5" /> .ics
      </button>
    </div>
  );
}

function UpcomingCard({ w, onCancel }: { w: ScheduledWatch; onCancel: (id: string) => void }) {
  const [pending, start] = useTransition();
  const going = w.invitees.filter((i) => i.status === "going");
  return (
    <div className="glass rounded-2xl p-4">
      <div className="flex items-start gap-3">
        <Link href={`/title/${w.titleId}`} className="shrink-0">
          <Poster title={w.title} src={w.poster_url} showTitle={false} rounded="rounded-lg" className="h-16 w-11 ring-1 ring-white/10" />
        </Link>
        <div className="min-w-0 flex-1">
          <Link href={`/title/${w.titleId}`} className="block">
            <p className="truncate text-[14.5px] font-bold hover:underline">
              {w.title}
              {w.season_number != null && w.episode_number != null ? ` · S${w.season_number} E${w.episode_number}` : ""}
            </p>
          </Link>
          <p className="mt-0.5 flex items-center gap-1.5 text-[13px] font-semibold text-primary">
            <CalendarClock className="size-3.5" /> {whenLabel(w.scheduled_at)}
          </p>
          {w.note && <p className="mt-1 text-[12.5px] text-muted-2">{w.note}</p>}
          {w.is_party && (
            <div className="mt-2 flex items-center gap-2">
              <div className="flex -space-x-2">
                {going.slice(0, 4).map((i) => (
                  <Avatar key={i.id} name={i.display_name} src={i.avatar_url} size="sm" className="size-6 ring-2 ring-bg" />
                ))}
              </div>
              <span className="text-[12px] text-muted-2">
                {w.isHost ? "You're hosting" : `Hosted by ${w.host.display_name}`}
                {going.length > 0 ? ` · ${going.length} going` : ""}
              </span>
            </div>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <ExportButtons w={w} />
            {w.isHost && (
              <button
                onClick={() => start(async () => { const r = await cancelScheduledWatch(w.id); if (r.ok) onCancel(w.id); })}
                disabled={pending}
                className="inline-flex items-center gap-1 rounded-lg border border-border bg-white/[0.03] px-2.5 py-1.5 text-[12px] font-semibold text-muted hover:text-danger disabled:opacity-60"
              >
                {pending ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />} Cancel
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function InviteCard({ w, onRsvp }: { w: ScheduledWatch; onRsvp: (w: ScheduledWatch, s: "going" | "maybe" | "declined") => void }) {
  const [pending, start] = useTransition();
  function rsvp(status: "going" | "maybe" | "declined") {
    start(async () => {
      const r = await rsvpWatch(w.id, status);
      if (r.ok) onRsvp(w, status);
    });
  }
  return (
    <div className="glass rounded-2xl border border-primary/20 p-4">
      <div className="flex items-start gap-3">
        <Link href={`/title/${w.titleId}`} className="shrink-0">
          <Poster title={w.title} src={w.poster_url} showTitle={false} rounded="rounded-lg" className="h-16 w-11 ring-1 ring-white/10" />
        </Link>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] text-muted-2">
            <Link href={`/u/${w.host.username}`} className="font-semibold text-foreground hover:underline">{w.host.display_name}</Link> invited you to watch
          </p>
          <Link href={`/title/${w.titleId}`} className="block">
            <p className="truncate text-[14.5px] font-bold hover:underline">
              {w.title}
              {w.season_number != null && w.episode_number != null ? ` · S${w.season_number} E${w.episode_number}` : ""}
            </p>
          </Link>
          <p className="mt-0.5 flex items-center gap-1.5 text-[13px] font-semibold text-primary">
            <CalendarClock className="size-3.5" /> {whenLabel(w.scheduled_at)}
          </p>
          {w.note && <p className="mt-1 text-[12.5px] text-muted-2">{w.note}</p>}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button onClick={() => rsvp("going")} disabled={pending} className="inline-flex items-center gap-1 rounded-lg bg-gradient-to-r from-primary to-primary-strong px-3 py-1.5 text-[12.5px] font-semibold text-white hover:brightness-110 disabled:opacity-60">
              <Check className="size-3.5" /> Going
            </button>
            <button onClick={() => rsvp("maybe")} disabled={pending} className="inline-flex items-center gap-1 rounded-lg border border-border bg-white/[0.03] px-3 py-1.5 text-[12.5px] font-semibold hover:bg-white/[0.07] disabled:opacity-60">
              <HelpCircle className="size-3.5" /> Maybe
            </button>
            <button onClick={() => rsvp("declined")} disabled={pending} className="inline-flex items-center gap-1 rounded-lg border border-border bg-white/[0.03] px-3 py-1.5 text-[12.5px] font-semibold text-muted hover:text-danger disabled:opacity-60">
              <X className="size-3.5" /> Can&apos;t
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
