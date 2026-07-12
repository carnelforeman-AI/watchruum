"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import {
  CalendarClock,
  CalendarDays,
  CalendarPlus,
  Trash2,
  Check,
  X,
  HelpCircle,
  Download,
  Bell,
  BellOff,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  List,
  LayoutGrid,
  MoreHorizontal,
  Film,
  Tv,
  PartyPopper,
  Plus,
} from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Poster } from "@/components/media/poster";
import { rsvpWatch, cancelScheduledWatch, setWatchNotify } from "@/app/schedule-actions";
import { downloadICS, downloadICSMulti, googleCalendarUrl, type CalendarEvent } from "@/lib/ics";
import { cn } from "@/lib/utils";
import type { ScheduledWatch } from "@/lib/schedule";

/* ------------------------------------------------------------------ helpers */

function dParts(iso: string) {
  const d = new Date(iso);
  return {
    date: d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" }),
    time: d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }),
  };
}

/** Local date key (YYYY-M-D) for matching calendar cells to watches. */
function dateKey(d: Date) {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
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

function badgeFor(w: ScheduledWatch): { label: string; cls: string } {
  if (w.is_party) return { label: "Watch Party", cls: "bg-accent/15 text-accent" };
  if (w.media_type === "tv") {
    if (w.episode_number === 1) return { label: "New Season", cls: "bg-primary/15 text-primary" };
    if (w.episode_number != null) return { label: "New Episode", cls: "bg-primary/15 text-primary" };
    return { label: "Series", cls: "bg-primary/15 text-primary" };
  }
  return { label: "Movie", cls: "bg-season/15 text-season" };
}

function scopeLabel(w: ScheduledWatch): string {
  if (w.media_type === "tv" && w.season_number != null && w.episode_number != null)
    return `Season ${w.season_number} · Episode ${w.episode_number}`;
  if (w.media_type === "tv") return "TV Show";
  return "Movie";
}

type TabKey = "upcoming" | "episodes" | "movies" | "tv" | "parties";
const TABS: { key: TabKey; label: string }[] = [
  { key: "upcoming", label: "Upcoming" },
  { key: "episodes", label: "Next Episodes" },
  { key: "movies", label: "Movies" },
  { key: "tv", label: "TV Shows" },
  { key: "parties", label: "Watch Parties" },
];

function matchesTab(w: ScheduledWatch, tab: TabKey): boolean {
  switch (tab) {
    case "episodes":
      return w.media_type === "tv" && w.episode_number != null;
    case "movies":
      return w.media_type === "movie";
    case "tv":
      return w.media_type === "tv";
    case "parties":
      return w.is_party;
    default:
      return true;
  }
}

/* ------------------------------------------------------------------ main */

export function MySchedule({
  initialUpcoming,
  initialInvites,
}: {
  initialUpcoming: ScheduledWatch[];
  initialInvites: ScheduledWatch[];
}) {
  const [upcoming, setUpcoming] = useState(initialUpcoming);
  const [invites, setInvites] = useState(initialInvites);
  const [tab, setTab] = useState<TabKey>("upcoming");
  const [sort, setSort] = useState<"soonest" | "latest">("soonest");
  const [view, setView] = useState<"list" | "grid">("list");
  const [visible, setVisible] = useState(6);
  const now = new Date();
  const [viewMonth, setViewMonth] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const [dayFilter, setDayFilter] = useState<string | null>(null);

  // Everything in one list (invites shown inline with RSVP controls).
  const all = useMemo(() => [...invites, ...upcoming], [invites, upcoming]);

  const counts = useMemo(
    () => ({
      upcoming: all.length,
      episodes: all.filter((w) => w.media_type === "tv" && w.episode_number != null).length,
      movies: all.filter((w) => w.media_type === "movie").length,
      parties: all.filter((w) => w.is_party).length,
    }),
    [all],
  );

  const filtered = useMemo(() => {
    let list = all.filter((w) => matchesTab(w, tab));
    if (dayFilter) list = list.filter((w) => dateKey(new Date(w.scheduled_at)) === dayFilter);
    list = [...list].sort((a, b) =>
      sort === "soonest" ? a.scheduled_at.localeCompare(b.scheduled_at) : b.scheduled_at.localeCompare(a.scheduled_at),
    );
    return list;
  }, [all, tab, dayFilter, sort]);

  const shown = filtered.slice(0, visible);

  // Calendar: which day-cells have a scheduled watch (any tab).
  const eventDays = useMemo(() => {
    const s = new Set<string>();
    for (const w of all) s.add(dateKey(new Date(w.scheduled_at)));
    return s;
  }, [all]);

  function onRsvp(w: ScheduledWatch, status: "going" | "maybe" | "declined") {
    setInvites((prev) => prev.filter((x) => x.id !== w.id));
    if (status === "going" || status === "maybe")
      setUpcoming((prev) => [...prev, { ...w, myRsvp: status }].sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at)));
  }
  function onCancel(id: string) {
    setUpcoming((prev) => prev.filter((x) => x.id !== id));
    setInvites((prev) => prev.filter((x) => x.id !== id));
  }
  function onNotify(id: string, next: boolean) {
    setUpcoming((prev) => prev.map((x) => (x.id === id ? { ...x, notify: next } : x)));
  }

  const empty = all.length === 0;

  return (
    <div>
      {/* Header */}
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <CalendarClock className="mt-1 size-6 shrink-0 text-primary" />
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">My Schedule</h1>
            <p className="text-[13px] text-muted-2">
              Everything you plan to watch — upcoming premieres, new episodes, and movies.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => all.length && downloadICSMulti(all.map(eventFor))}
            disabled={empty}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-white/[0.03] px-3.5 py-2 text-[13px] font-semibold hover:bg-white/[0.07] disabled:opacity-50"
          >
            <CalendarDays className="size-4" /> Sync Calendar
          </button>
          <Link
            href="/trending"
            className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-primary to-primary-strong px-3.5 py-2 text-[13px] font-semibold text-white hover:brightness-110"
          >
            <Plus className="size-4" /> Add to Schedule
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-5 flex items-center gap-5 overflow-x-auto border-b border-border no-scrollbar">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => {
              setTab(t.key);
              setVisible(6);
            }}
            className={cn(
              "relative shrink-0 pb-2.5 text-[14px] font-semibold transition-colors",
              tab === t.key ? "text-foreground" : "text-muted-2 hover:text-foreground",
            )}
          >
            {t.label}
            {tab === t.key && <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-primary" />}
          </button>
        ))}
      </div>

      <div className="flex gap-6">
        {/* Main column */}
        <div className="min-w-0 flex-1">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-[15px] font-bold">
              {TABS.find((t) => t.key === tab)!.label}{" "}
              <span className="text-muted-2">({filtered.length})</span>
              {dayFilter && (
                <button onClick={() => setDayFilter(null)} className="ml-2 text-[12px] font-semibold text-primary hover:underline">
                  Clear day
                </button>
              )}
            </h2>
            <div className="flex items-center gap-2">
              <div className="relative">
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value as "soonest" | "latest")}
                  aria-label="Sort"
                  className="appearance-none rounded-xl border border-border bg-white/[0.03] py-2 pl-3 pr-8 text-[12.5px] font-semibold outline-none hover:border-primary/50 focus:border-primary/60"
                >
                  <option value="soonest">Sort by soonest</option>
                  <option value="latest">Sort by latest</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-2" />
              </div>
              <div className="flex items-center rounded-xl border border-border bg-white/[0.03] p-0.5">
                <button
                  onClick={() => setView("list")}
                  aria-label="List view"
                  className={cn("grid size-8 place-items-center rounded-lg", view === "list" ? "bg-primary text-white" : "text-muted-2 hover:text-foreground")}
                >
                  <List className="size-4" />
                </button>
                <button
                  onClick={() => setView("grid")}
                  aria-label="Grid view"
                  className={cn("grid size-8 place-items-center rounded-lg", view === "grid" ? "bg-primary text-white" : "text-muted-2 hover:text-foreground")}
                >
                  <LayoutGrid className="size-4" />
                </button>
              </div>
            </div>
          </div>

          {empty ? (
            <div className="glass grid place-items-center rounded-2xl py-14 text-center">
              <CalendarClock className="mb-2 size-8 text-muted-2" />
              <p className="font-semibold">Nothing scheduled yet</p>
              <p className="mt-1 max-w-xs text-[13px] text-muted-2">
                Open any show or movie and hit <span className="font-semibold text-foreground">Schedule watch</span> to plan when
                you&apos;ll watch — solo or with friends.
              </p>
              <Link href="/trending" className="mt-4 text-[13px] font-semibold text-primary hover:underline">
                Browse something to watch
              </Link>
            </div>
          ) : filtered.length === 0 ? (
            <div className="glass rounded-2xl py-10 text-center text-[13px] text-muted-2">
              Nothing in this view{dayFilter ? " on the selected day" : ""}.
            </div>
          ) : view === "grid" ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {shown.map((w) => (
                <WatchCard key={w.id} w={w} grid onRsvp={onRsvp} onCancel={onCancel} onNotify={onNotify} />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {shown.map((w) => (
                <WatchCard key={w.id} w={w} onRsvp={onRsvp} onCancel={onCancel} onNotify={onNotify} />
              ))}
            </div>
          )}

          {filtered.length > visible && (
            <button
              onClick={() => setVisible((v) => v + 6)}
              className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-2xl border border-border bg-white/[0.02] py-3 text-[13px] font-semibold text-muted hover:bg-white/[0.05]"
            >
              Load more <ChevronDown className="size-4" />
            </button>
          )}
        </div>

        {/* Right rail */}
        <aside className="hidden w-[320px] shrink-0 space-y-4 xl:block">
          <CalendarWidget
            month={viewMonth}
            setMonth={setViewMonth}
            eventDays={eventDays}
            today={now}
            dayFilter={dayFilter}
            setDayFilter={setDayFilter}
          />

          <div className="glass rounded-2xl p-4">
            <h3 className="mb-3 text-[14px] font-bold">Schedule Overview</h3>
            <div className="grid grid-cols-2 gap-2.5">
              <OverviewTile icon={<CalendarClock className="size-4" />} n={counts.upcoming} label="Upcoming" tint="text-primary" />
              <OverviewTile icon={<Tv className="size-4" />} n={counts.episodes} label="New Episodes" tint="text-accent" />
              <OverviewTile icon={<Film className="size-4" />} n={counts.movies} label="Movies" tint="text-season" />
              <OverviewTile icon={<PartyPopper className="size-4" />} n={counts.parties} label="Watch Parties" tint="text-safe" />
            </div>
          </div>

          <div className="glass rounded-2xl p-4">
            <h3 className="mb-3 text-[14px] font-bold">Filters</h3>
            <div className="space-y-1">
              {([
                ["upcoming", "All", <CalendarClock key="a" className="size-4" />],
                ["episodes", "New Episodes", <Tv key="b" className="size-4" />],
                ["movies", "Movies", <Film key="c" className="size-4" />],
                ["parties", "Watch Parties", <PartyPopper key="d" className="size-4" />],
              ] as const).map(([key, label, icon]) => (
                <button
                  key={key}
                  onClick={() => {
                    setTab(key as TabKey);
                    setVisible(6);
                  }}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-[13px] font-semibold transition-colors",
                    tab === key ? "bg-primary/10 text-foreground" : "text-muted hover:bg-white/5",
                  )}
                >
                  <span className={tab === key ? "text-primary" : "text-muted-2"}>{icon}</span>
                  {label}
                  {tab === key && <Check className="ml-auto size-4 text-primary" />}
                </button>
              ))}
            </div>
          </div>

          <div className="glass rounded-2xl p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-[14px] font-bold">Never miss anything</h3>
                <p className="mt-1 text-[12px] text-muted-2">Get notified before shows and movies you want to watch.</p>
              </div>
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary/15 text-primary">
                <Bell className="size-4" />
              </span>
            </div>
            <Link
              href="/settings"
              className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-[13px] font-semibold text-white hover:brightness-110"
            >
              Manage Notifications
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ tiles */

function OverviewTile({ icon, n, label, tint }: { icon: React.ReactNode; n: number; label: string; tint: string }) {
  return (
    <div className="rounded-xl border border-border bg-white/[0.02] p-3">
      <div className="flex items-center justify-between">
        <span className={cn("grid size-7 place-items-center rounded-lg bg-white/5", tint)}>{icon}</span>
        <span className="text-xl font-extrabold">{n}</span>
      </div>
      <p className="mt-1.5 text-[12px] text-muted-2">{label}</p>
    </div>
  );
}

/* ------------------------------------------------------------------ calendar */

const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function CalendarWidget({
  month,
  setMonth,
  eventDays,
  today,
  dayFilter,
  setDayFilter,
}: {
  month: { y: number; m: number };
  setMonth: (m: { y: number; m: number }) => void;
  eventDays: Set<string>;
  today: Date;
  dayFilter: string | null;
  setDayFilter: (d: string | null) => void;
}) {
  const first = new Date(month.y, month.m, 1);
  const lead = first.getDay();
  const daysInMonth = new Date(month.y, month.m + 1, 0).getDate();
  const cells: (number | null)[] = [...Array(lead).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  const todayKey = dateKey(today);

  function shift(delta: number) {
    const d = new Date(month.y, month.m + delta, 1);
    setMonth({ y: d.getFullYear(), m: d.getMonth() });
  }

  return (
    <div className="glass rounded-2xl p-4">
      <div className="mb-2 flex items-center justify-between">
        <button onClick={() => shift(-1)} aria-label="Previous month" className="grid size-7 place-items-center rounded-lg text-muted-2 hover:bg-white/10 hover:text-foreground">
          <ChevronLeft className="size-4" />
        </button>
        <span className="text-[13.5px] font-bold">
          {MONTHS[month.m]} {month.y}
        </span>
        <button onClick={() => shift(1)} aria-label="Next month" className="grid size-7 place-items-center rounded-lg text-muted-2 hover:bg-white/10 hover:text-foreground">
          <ChevronRight className="size-4" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-semibold uppercase tracking-wide text-muted-2">
        {DOW.map((d) => (
          <div key={d} className="py-1">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          if (day == null) return <div key={`e${i}`} />;
          const key = `${month.y}-${month.m}-${day}`;
          const has = eventDays.has(key);
          const isToday = key === todayKey;
          const isSel = key === dayFilter;
          return (
            <button
              key={key}
              onClick={() => has && setDayFilter(isSel ? null : key)}
              disabled={!has}
              className={cn(
                "relative grid aspect-square place-items-center rounded-lg text-[12px] font-semibold transition-colors",
                isSel ? "bg-primary text-white" : isToday ? "bg-white/10 text-foreground" : "text-muted",
                has && !isSel ? "hover:bg-white/10" : "",
                !has ? "cursor-default text-muted-2/70" : "",
              )}
            >
              {day}
              {has && <span className={cn("absolute bottom-1 size-1 rounded-full", isSel ? "bg-white" : "bg-primary")} />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ card */

function WatchCard({
  w,
  grid = false,
  onRsvp,
  onCancel,
  onNotify,
}: {
  w: ScheduledWatch;
  grid?: boolean;
  onRsvp: (w: ScheduledWatch, s: "going" | "maybe" | "declined") => void;
  onCancel: (id: string) => void;
  onNotify: (id: string, next: boolean) => void;
}) {
  const [pending, start] = useTransition();
  const [menu, setMenu] = useState(false);
  const [notify, setNotifyState] = useState(w.notify);
  const badge = badgeFor(w);
  const { date, time } = dParts(w.scheduled_at);
  const isInvite = w.myRsvp === "invited" && !w.isHost;
  const going = w.invitees.filter((i) => i.status === "going");

  function toggleNotify() {
    const next = !notify;
    setNotifyState(next);
    onNotify(w.id, next);
    start(() => {
      setWatchNotify(w.id, next);
    });
  }

  return (
    <div className={cn("glass rounded-2xl p-3.5", grid ? "" : "sm:flex sm:items-center sm:gap-4")}>
      {/* Title block */}
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <Link href={`/title/${w.titleId}`} className="shrink-0">
          <Poster title={w.title} src={w.poster_url} showTitle={false} rounded="rounded-lg" className="h-[62px] w-[42px] ring-1 ring-white/10" />
        </Link>
        <div className="min-w-0 flex-1">
          <Link href={`/title/${w.titleId}`} className="block">
            <p className="truncate text-[14.5px] font-bold hover:underline">{w.title}</p>
          </Link>
          <p className="mt-0.5 truncate text-[12.5px] text-muted-2">{scopeLabel(w)}</p>
          <span className={cn("mt-1.5 inline-block rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide", badge.cls)}>
            {badge.label}
          </span>
        </div>
      </div>

      {/* When */}
      <div className={cn("shrink-0", grid ? "mt-3" : "mt-3 sm:mt-0")}>
        <p className="flex items-center gap-1.5 text-[13px] font-semibold">
          <CalendarClock className="size-3.5 text-primary" /> {date}
        </p>
        <p className="mt-0.5 pl-5 text-[12.5px] text-muted-2">{time}</p>
        {w.is_party && (
          <div className="mt-1.5 flex items-center gap-1.5 pl-5">
            <div className="flex -space-x-2">
              {going.slice(0, 3).map((i) => (
                <Avatar key={i.id} name={i.display_name} src={i.avatar_url} size="sm" className="size-5 ring-2 ring-bg" />
              ))}
            </div>
            <span className="text-[11px] text-muted-2">
              {w.isHost ? "You're hosting" : `Hosted by ${w.host.display_name}`}
              {going.length ? ` · ${going.length} going` : ""}
            </span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className={cn("flex shrink-0 items-center gap-2", grid ? "mt-3" : "mt-3 sm:mt-0")}>
        {isInvite ? (
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => start(async () => { const r = await rsvpWatch(w.id, "going"); if (r.ok) onRsvp(w, "going"); })}
              disabled={pending}
              className="inline-flex items-center gap-1 rounded-lg bg-gradient-to-r from-primary to-primary-strong px-2.5 py-1.5 text-[12px] font-semibold text-white hover:brightness-110 disabled:opacity-60"
            >
              <Check className="size-3.5" /> Going
            </button>
            <button
              onClick={() => start(async () => { const r = await rsvpWatch(w.id, "maybe"); if (r.ok) onRsvp(w, "maybe"); })}
              disabled={pending}
              className="inline-flex items-center gap-1 rounded-lg border border-border bg-white/[0.03] px-2.5 py-1.5 text-[12px] font-semibold hover:bg-white/[0.07] disabled:opacity-60"
            >
              <HelpCircle className="size-3.5" /> Maybe
            </button>
            <button
              onClick={() => start(async () => { const r = await rsvpWatch(w.id, "declined"); if (r.ok) onRsvp(w, "declined"); })}
              disabled={pending}
              aria-label="Can't make it"
              className="inline-flex items-center gap-1 rounded-lg border border-border bg-white/[0.03] px-2 py-1.5 text-[12px] font-semibold text-muted hover:text-danger disabled:opacity-60"
            >
              <X className="size-3.5" />
            </button>
          </div>
        ) : (
          <button
            onClick={toggleNotify}
            disabled={pending}
            aria-pressed={notify}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-[12.5px] font-semibold transition-colors disabled:opacity-60",
              notify ? "border-primary/40 bg-primary/10 text-primary" : "border-border bg-white/[0.03] text-muted hover:text-foreground",
            )}
          >
            {notify ? <Bell className="size-3.5" /> : <BellOff className="size-3.5" />}
            {notify ? "Notify me" : "Muted"}
          </button>
        )}

        {/* Overflow */}
        <div className="relative">
          <button
            onClick={() => setMenu((m) => !m)}
            aria-label="More options"
            className="grid size-9 place-items-center rounded-xl border border-border bg-white/[0.03] text-muted-2 hover:text-foreground"
          >
            <MoreHorizontal className="size-4" />
          </button>
          {menu && (
            <>
              <button className="fixed inset-0 z-10 cursor-default" aria-hidden onClick={() => setMenu(false)} />
              <div className="absolute right-0 top-11 z-20 w-52 overflow-hidden rounded-xl border border-border bg-bg-elevated shadow-2xl">
                <a
                  href={googleCalendarUrl(eventFor(w))}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setMenu(false)}
                  className="flex items-center gap-2.5 px-3.5 py-2.5 text-[13px] font-medium hover:bg-white/5"
                >
                  <CalendarPlus className="size-4 text-muted-2" /> Add to Google Calendar
                </a>
                <button
                  onClick={() => {
                    downloadICS(eventFor(w), `watchruum-${w.title.toLowerCase().replace(/\s+/g, "-")}.ics`);
                    setMenu(false);
                  }}
                  className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-[13px] font-medium hover:bg-white/5"
                >
                  <Download className="size-4 text-muted-2" /> Download .ics
                </button>
                {w.isHost && (
                  <button
                    onClick={() => {
                      setMenu(false);
                      start(async () => {
                        const r = await cancelScheduledWatch(w.id);
                        if (r.ok) onCancel(w.id);
                      });
                    }}
                    className="flex w-full items-center gap-2.5 border-t border-border px-3.5 py-2.5 text-[13px] font-medium text-danger hover:bg-danger/10"
                  >
                    <Trash2 className="size-4" /> Cancel watch
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
