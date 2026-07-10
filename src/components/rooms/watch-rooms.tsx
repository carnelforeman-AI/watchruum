"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Users,
  MessageSquare,
  Activity,
  Plus,
  Search,
  SlidersHorizontal,
  Filter,
  Flame,
  TrendingUp,
  Sparkles,
  Clock,
  Shield,
  Zap,
  UserPlus,
  BookmarkCheck,
  ChevronRight,
  X,
} from "lucide-react";
import { Poster } from "@/components/media/poster";
import { cn, compact } from "@/lib/utils";
import type { WatchRoom, WatchRoomsData } from "@/lib/rooms-types";

const TABS = [
  { key: "active", label: "Most Active", icon: Zap },
  { key: "engaged", label: "Most Engaged", icon: Flame },
  { key: "trending", label: "Trending", icon: TrendingUp },
  { key: "new", label: "New Rooms", icon: Sparkles, badge: "NEW" },
  { key: "mine", label: "My Rooms", icon: Users },
] as const;

type TabKey = (typeof TABS)[number]["key"];

function roomHref(r: WatchRoom): string {
  if (r.media.media_type === "movie") return `/title/${r.media.id}/room`;
  if (r.seasonNumber != null && r.episodeNumber != null)
    return `/title/${r.media.id}/season/${r.seasonNumber}/episode/${r.episodeNumber}`;
  return `/title/${r.media.id}`;
}

/* --------------------------------------------------------------- ring */

function EngagementRing({ value }: { value: number }) {
  const r = 26;
  const c = 2 * Math.PI * r;
  const off = c * (1 - value / 100);
  return (
    <div className="relative grid size-[68px] shrink-0 place-items-center">
      <svg viewBox="0 0 64 64" className="size-[68px] -rotate-90">
        <circle cx="32" cy="32" r={r} fill="none" strokeWidth="5" className="stroke-white/10" />
        <circle
          cx="32"
          cy="32"
          r={r}
          fill="none"
          stroke="url(#ring-grad)"
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={off}
        />
        <defs>
          <linearGradient id="ring-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#7c3aed" />
            <stop offset="1" stopColor="#3b82f6" />
          </linearGradient>
        </defs>
      </svg>
      <span className="absolute text-[13px] font-extrabold">{value}%</span>
    </div>
  );
}

/* --------------------------------------------------------------- chips */

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-md border border-border bg-white/[0.04] px-2 py-0.5 text-[11px] font-semibold text-muted">
      {children}
    </span>
  );
}

function Stat({ icon: Icon, value, label }: { icon: typeof Users; value: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="size-4 shrink-0 text-muted-2" />
      <div className="leading-tight">
        <p className="text-[14px] font-bold">{value}</p>
        <p className="text-[10px] uppercase tracking-wide text-muted-2">{label}</p>
      </div>
    </div>
  );
}

/* --------------------------------------------------------------- card */

function RoomRow({ room }: { room: WatchRoom }) {
  return (
    <div className="glass group relative flex flex-col gap-4 rounded-2xl border border-border-soft p-3 transition-colors hover:border-primary/40 sm:flex-row">
      {/* poster + rank */}
      <Link href={roomHref(room)} className="relative block w-24 shrink-0 self-center sm:self-start">
        <span className="absolute -left-1 -top-1 z-10 grid size-7 place-items-center rounded-lg bg-primary text-[13px] font-bold text-white shadow-lg ring-2 ring-black/40">
          {room.rank}
        </span>
        <Poster
          title={room.media.title}
          src={room.media.poster_url}
          genres={room.media.genres}
          showTitle={false}
          rounded="rounded-xl"
          className="aspect-[2/3] w-24"
        />
      </Link>

      {/* main */}
      <div className="min-w-0 flex-1">
        <Link href={roomHref(room)} className="block">
          <h3 className="truncate text-[17px] font-extrabold leading-tight hover:text-primary">{room.media.title}</h3>
        </Link>
        <p className="mt-0.5 truncate text-[13px] text-muted">{room.scopeLabel}</p>

        <div className="mt-1.5 flex items-center gap-1.5 text-[12px] font-bold">
          {room.live ? (
            <span className="inline-flex items-center gap-1.5 text-safe">
              <span className="size-1.5 rounded-full bg-safe" /> LIVE NOW
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-warn">
              <span className="size-1.5 rounded-full bg-warn" /> HOT ROOM
            </span>
          )}
        </div>

        <div className="mt-2.5 flex flex-wrap gap-1.5">
          <Chip>{room.seasonTag}</Chip>
          <Chip>{room.spoilerTag}</Chip>
          {room.network && <Chip>{room.network}</Chip>}
        </div>
      </div>

      {/* stats */}
      <div className="flex shrink-0 flex-row gap-5 sm:flex-col sm:gap-2.5 sm:self-center">
        <Stat icon={Users} value={compact(room.inRoom)} label="In Room" />
        <Stat icon={MessageSquare} value={compact(room.messages)} label="Messages" />
        <Stat icon={Activity} value={compact(room.engagement)} label="Engagement" />
      </div>

      {/* ring + join */}
      <div className="flex shrink-0 flex-row items-center gap-4 sm:w-[132px] sm:flex-col sm:justify-center sm:gap-2">
        <div className="flex flex-col items-center">
          <EngagementRing value={room.engagementScore} />
          <p className="mt-1 text-[10px] uppercase tracking-wide text-muted-2">Engagement Score</p>
        </div>
        <Link
          href={roomHref(room)}
          className="inline-flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-primary to-primary-strong px-4 py-2 text-[13px] font-bold text-white shadow-[0_8px_24px_-10px_rgba(124,58,237,0.9)] transition hover:brightness-110"
        >
          Join Room
        </Link>
      </div>
    </div>
  );
}

/* --------------------------------------------------------------- rail */

function RailPanel({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof Flame;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="glass rounded-2xl border border-border-soft p-4">
      <div className="mb-3 flex items-center gap-2">
        <Icon className="size-4 text-primary" />
        <h3 className="text-[14px] font-bold">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function TrendingNow({ rooms }: { rooms: WatchRoom[] }) {
  return (
    <RailPanel icon={Flame} title="Trending Now">
      <ol className="space-y-2.5">
        {rooms.map((r, i) => (
          <li key={r.id}>
            <Link href={roomHref(r)} className="flex items-center gap-2.5 rounded-lg p-1 transition-colors hover:bg-white/5">
              <span className="w-3 text-[13px] font-bold text-muted-2">{i + 1}</span>
              <Poster
                title={r.media.title}
                src={r.media.poster_url}
                genres={r.media.genres}
                showTitle={false}
                rounded="rounded-md"
                className="h-11 w-8 shrink-0 ring-1 ring-white/10"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-semibold">{r.media.title}</p>
                <p className="truncate text-[11px] text-muted-2">
                  {r.media.media_type === "tv" && r.seasonNumber != null ? `S${r.seasonNumber} E${r.episodeNumber}` : r.seasonTag}
                </p>
              </div>
              <span className="shrink-0 text-[11px] text-muted-2">
                <span className="mr-1 inline-block size-1.5 rounded-full bg-primary align-middle" />
                {compact(r.inRoom)} in room
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </RailPanel>
  );
}

function Leaderboard({ rooms }: { rooms: WatchRoom[] }) {
  return (
    <RailPanel icon={Activity} title="Engagement Leaderboard">
      <ol className="space-y-2.5">
        {rooms.map((r, i) => (
          <li key={r.id}>
            <Link href={roomHref(r)} className="flex items-center gap-2.5 rounded-lg p-1 transition-colors hover:bg-white/5">
              <span className="w-3 text-[13px] font-bold text-muted-2">{i + 1}</span>
              <Poster
                title={r.media.title}
                src={r.media.poster_url}
                genres={r.media.genres}
                showTitle={false}
                rounded="rounded-md"
                className="size-8 shrink-0 object-cover ring-1 ring-white/10"
              />
              <p className="min-w-0 flex-1 truncate text-[13px] font-semibold">{r.media.title}</p>
              <span className="shrink-0 text-[12px] font-bold text-primary">{compact(r.engagement)}</span>
            </Link>
          </li>
        ))}
      </ol>
      <Link href="#" className="mt-3 flex items-center gap-1 text-[12px] font-semibold text-primary hover:underline">
        View Full Leaderboard <ChevronRight className="size-3.5" />
      </Link>
    </RailPanel>
  );
}

/* --------------------------------------------------------------- page */

export function WatchRooms({ data }: { data: WatchRoomsData }) {
  const [tab, setTab] = useState<TabKey>("active");
  const [query, setQuery] = useState("");
  const [az, setAz] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [network, setNetwork] = useState<string | null>(null);
  const [notice, setNotice] = useState(false);

  const networks = useMemo(
    () => Array.from(new Set(data.rooms.map((r) => r.network).filter(Boolean))) as string[],
    [data.rooms],
  );

  const visible = useMemo(() => {
    let list = [...data.rooms];
    const q = query.trim().toLowerCase();
    if (q) list = list.filter((r) => r.media.title.toLowerCase().includes(q));
    if (network) list = list.filter((r) => r.network === network);

    if (tab === "engaged") list.sort((a, b) => b.engagementScore - a.engagementScore);
    else if (tab === "trending") list.sort((a, b) => Number(b.hot) - Number(a.hot) || b.engagement - a.engagement);
    else if (tab === "new") list.reverse();
    else if (tab === "mine") list = [];
    else list.sort((a, b) => b.inRoom - a.inRoom); // active

    if (az) list = [...list].sort((a, b) => a.media.title.localeCompare(b.media.title));
    return list;
  }, [data.rooms, query, network, tab, az]);

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6 md:px-6">
      {/* header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-extrabold tracking-tight">Watch Rooms</h1>
          <p className="mt-1 text-sm text-muted">Join live conversations about your favorite shows and movies.</p>
        </div>
        <button
          onClick={() => setNotice(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary to-primary-strong px-4 py-2.5 text-[14px] font-bold text-white shadow-[0_8px_24px_-10px_rgba(124,58,237,0.9)] transition hover:brightness-110"
        >
          <Plus className="size-4" /> Create Room
        </button>
      </div>

      {notice && (
        <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-primary/30 bg-primary/10 px-4 py-2.5 text-[13px] text-foreground">
          <span>Room creation is coming soon — for now, jump into any trending room below.</span>
          <button onClick={() => setNotice(false)} aria-label="Dismiss" className="text-muted hover:text-foreground">
            <X className="size-4" />
          </button>
        </div>
      )}

      {/* search + controls */}
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[240px] flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-2" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search rooms, shows, movies, or keywords..."
            className="w-full rounded-xl border border-border bg-white/[0.03] py-3 pl-10 pr-4 text-[14px] outline-none transition focus:border-primary/50"
          />
        </div>
        <button
          onClick={() => setAz((v) => !v)}
          className={cn(
            "inline-flex items-center gap-2 rounded-xl border px-3.5 py-3 text-[13px] font-semibold transition",
            az ? "border-primary/50 bg-primary/10 text-foreground" : "border-border bg-white/[0.03] text-muted hover:text-foreground",
          )}
        >
          <SlidersHorizontal className="size-4" /> A-Z Search
        </button>
        <button
          onClick={() => setShowFilters((v) => !v)}
          className={cn(
            "inline-flex items-center gap-2 rounded-xl border px-3.5 py-3 text-[13px] font-semibold transition",
            showFilters || network
              ? "border-primary/50 bg-primary/10 text-foreground"
              : "border-border bg-white/[0.03] text-muted hover:text-foreground",
          )}
        >
          <Filter className="size-4" /> Filters
        </button>
      </div>

      {showFilters && networks.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-[12px] font-semibold text-muted-2">Network:</span>
          <button
            onClick={() => setNetwork(null)}
            className={cn(
              "rounded-full px-3 py-1 text-[12px] font-semibold transition",
              !network ? "bg-primary text-white" : "border border-border bg-white/[0.03] text-muted hover:text-foreground",
            )}
          >
            All
          </button>
          {networks.map((n) => (
            <button
              key={n}
              onClick={() => setNetwork((cur) => (cur === n ? null : n))}
              className={cn(
                "rounded-full px-3 py-1 text-[12px] font-semibold transition",
                network === n ? "bg-primary text-white" : "border border-border bg-white/[0.03] text-muted hover:text-foreground",
              )}
            >
              {n}
            </button>
          ))}
        </div>
      )}

      {/* tabs */}
      <div className="mt-5 flex gap-1 overflow-x-auto border-b border-border pb-px no-scrollbar">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                "relative inline-flex shrink-0 items-center gap-2 px-4 py-2.5 text-[14px] font-semibold transition",
                active ? "text-foreground" : "text-muted hover:text-foreground",
              )}
            >
              <Icon className={cn("size-4", active && "text-primary")} />
              {t.label}
              {"badge" in t && t.badge && (
                <span className="rounded bg-primary px-1.5 py-0.5 text-[9px] font-bold text-white">{t.badge}</span>
              )}
              {active && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-primary" />}
            </button>
          );
        })}
      </div>

      {/* body */}
      <div className="mt-5 flex gap-6">
        <div className="min-w-0 flex-1 space-y-3">
          {visible.length === 0 ? (
            <div className="glass rounded-2xl p-12 text-center">
              <Users className="mx-auto size-10 text-muted-2/50" />
              <p className="mt-3 font-semibold">{tab === "mine" ? "You haven't joined any rooms yet" : "No rooms match your search"}</p>
              <p className="mt-1 text-sm text-muted-2">
                {tab === "mine" ? "Join a room and it'll show up here." : "Try a different tab or clear your filters."}
              </p>
            </div>
          ) : (
            visible.map((room) => <RoomRow key={room.id} room={room} />)
          )}

          {visible.length > 0 && (
            <div className="flex justify-center pt-2">
              <button className="inline-flex items-center gap-2 rounded-full border border-border bg-white/[0.03] px-5 py-2.5 text-[13px] font-semibold text-muted transition hover:text-foreground">
                View More Rooms
              </button>
            </div>
          )}
        </div>

        {/* right rail */}
        <aside className="hidden w-[300px] shrink-0 space-y-4 lg:block">
          <TrendingNow rooms={data.trendingNow} />
          <Leaderboard rooms={data.leaderboard} />

          <div className="glass rounded-2xl border border-border-soft p-4 text-center">
            <div className="mb-1 flex items-center justify-center gap-2">
              <Users className="size-4 text-primary" />
              <h3 className="text-[13px] font-bold">Active Now Across All Rooms</h3>
            </div>
            <p className="brand-gradient bg-clip-text text-[34px] font-extrabold text-transparent">
              {data.activeNow.toLocaleString("en-US")}
            </p>
            <p className="text-[12px] text-muted-2">Fans watching and chatting</p>
          </div>

          <RailPanel icon={Clock} title="Room Tips">
            <ul className="space-y-2 text-[12px] text-muted">
              <li className="flex gap-2"><span className="text-primary">•</span> Choose the room for the episode you&apos;re on.</li>
              <li className="flex gap-2"><span className="text-primary">•</span> Be respectful and follow spoiler rules.</li>
              <li className="flex gap-2"><span className="text-primary">•</span> Use spoiler tags when needed.</li>
            </ul>
            <Link href="#" className="mt-3 flex items-center gap-1 text-[12px] font-semibold text-primary hover:underline">
              View Room Rules <ChevronRight className="size-3.5" />
            </Link>
          </RailPanel>
        </aside>
      </div>

      {/* feature strip */}
      <div className="mt-8 grid grid-cols-2 gap-3 border-t border-border pt-6 md:grid-cols-4">
        <Feature icon={Shield} title="Spoiler Safe" sub="Communities" />
        <Feature icon={Zap} title="Real-time" sub="Conversations" />
        <Feature icon={UserPlus} title="Find Your" sub="People" />
        <Feature icon={BookmarkCheck} title="Track Your" sub="Watch" />
      </div>
    </div>
  );
}

function Feature({ icon: Icon, title, sub }: { icon: typeof Shield; title: string; sub: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary">
        <Icon className="size-[18px]" />
      </div>
      <div className="leading-tight">
        <p className="text-[13px] font-bold">{title}</p>
        <p className="text-[12px] text-muted-2">{sub}</p>
      </div>
    </div>
  );
}
