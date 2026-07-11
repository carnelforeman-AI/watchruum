"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Award,
  Star,
  ShieldCheck,
  Heart,
  Flame,
  CheckCircle2,
  Zap,
  Gem,
  Trophy,
  Calendar,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Info,
  ArrowDown,
} from "lucide-react";
import { cn, compact, initials, posterGradient } from "@/lib/utils";
import type { LeaderMember, LeaderStats } from "@/lib/leaderboard";

/* ---------------- data (seeded placeholder) ---------------- */

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const HANDLES = [
  "NovaBinge", "PixelSage", "EchoFan", "CrimsonJay", "VeloxWatch", "LoreKeeper", "StreamHawk", "QuietRiot",
  "SableFox", "IronWatch", "MidnightMara", "AstroVibe", "CozyCritic", "RogueReel", "EmberQueen", "FrostByte",
  "LunaLoot", "MangoMind", "OrbitOtter", "PlasmaPanda", "QuasarQuill", "RiverReed", "SolarSprite", "TidalToad",
  "VividVixen", "WillowWisp", "YonderYak", "ZephyrZed", "BingeBaron", "SceneSeeker", "ReelRebel", "PlotPirate",
  "SpoilerShield", "CasualCanon", "ArcAngel", "BingeBotanist", "CriticCat", "DriftDreamer", "FableFinch", "GlowGoblin",
];

const BADGES = [
  { icon: Star, color: "bg-primary/20 text-primary ring-primary/30" },
  { icon: ShieldCheck, color: "bg-accent/20 text-accent ring-accent/30" },
  { icon: Heart, color: "bg-danger/20 text-danger ring-danger/30" },
  { icon: Flame, color: "bg-warn/20 text-warn ring-warn/30" },
  { icon: CheckCircle2, color: "bg-safe/20 text-safe ring-safe/30" },
  { icon: Award, color: "bg-primary/20 text-primary ring-primary/30" },
  { icon: Zap, color: "bg-accent-2/20 text-accent-2 ring-accent-2/30" },
  { icon: Gem, color: "bg-primary/20 text-primary ring-primary/30" },
];

const TOTAL = 1248;
const PER_PAGE = 8;

type Member = LeaderMember;

function generate(): Member[] {
  const rng = mulberry32(1337);
  const list: Member[] = [];
  for (let i = 0; i < TOTAL; i++) {
    const decay = Math.pow(0.965, i);
    const quality = Math.max(500, Math.round(116000 * decay * (0.85 + rng() * 0.3)));
    const helpful = Math.max(30, Math.round(2200 * decay * (0.8 + rng() * 0.4)));
    const spoiler = Math.max(5, Math.round(350 * decay * (0.8 + rng() * 0.4)));
    const reports = Math.max(2, Math.round(160 * decay * (0.8 + rng() * 0.4)));
    const badges: number[] = [];
    while (badges.length < 3) {
      const b = Math.floor(rng() * BADGES.length);
      if (!badges.includes(b)) badges.push(b);
    }
    const extra = 2 + Math.floor(rng() * 8);
    const role: Member["role"] =
      i === 0 ? "Mod" : i === 1 ? "Leader" : rng() < 0.06 ? (rng() < 0.5 ? "Mod" : "Leader") : null;
    const name = HANDLES[i % HANDLES.length] + (i < HANDLES.length ? "" : String(Math.floor(i / HANDLES.length) + 1));
    list.push({ id: i, name, quality, helpful, spoiler, reports, badges, extra, role });
  }
  return list;
}

/* ---------------- tabs ---------------- */

const TABS = [
  { key: "quality", label: "Quality Leaders", metric: (m: Member) => m.quality },
  { key: "spoiler", label: "Spoiler Guardians", metric: (m: Member) => m.spoiler },
  { key: "discussion", label: "Discussion Leaders", metric: (m: Member) => m.helpful },
  { key: "alltime", label: "All-Time Leaders", metric: (m: Member) => m.quality + m.helpful * 20 },
] as const;

const PERIODS = ["This Month", "Last Month", "This Year", "All-Time"] as const;

const STATS = [
  { label: "Quality Leaders", value: "1,248", sub: "Members recognized", icon: Star, tone: "bg-primary/15 text-primary" },
  { label: "Positive Interactions", value: "98.7K", sub: "Helpful, kind & supportive", icon: CheckCircle2, tone: "bg-safe/15 text-safe" },
  { label: "Spoilers Prevented", value: "4,215", sub: "Thanks to our community", icon: ShieldCheck, tone: "bg-accent/15 text-accent" },
  { label: "Reports Resolved", value: "2,893", sub: "Issues handled", icon: Flame, tone: "bg-danger/15 text-danger" },
];

/* ---------------- component ---------------- */

export function LeaderboardView({
  live = false,
  members,
  stats,
}: {
  live?: boolean;
  members?: LeaderMember[];
  stats?: LeaderStats;
} = {}) {
  const demo = useMemo(() => generate(), []);
  const all = live && members ? members : demo;
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("quality");
  const [page, setPage] = useState(1);
  const [period, setPeriod] = useState<(typeof PERIODS)[number]>("This Month");
  const [showInfo, setShowInfo] = useState(false);

  const ranked = useMemo(() => {
    const metric = TABS.find((t) => t.key === tab)!.metric;
    return [...all].sort((a, b) => metric(b) - metric(a));
  }, [all, tab]);

  const pages = Math.max(1, Math.ceil(ranked.length / PER_PAGE));
  const start = (Math.min(page, pages) - 1) * PER_PAGE;
  const rows = ranked.slice(start, start + PER_PAGE);

  const statCards =
    live && stats
      ? [
          { ...STATS[0], value: compact(stats.quality), sub: "Members recognized" },
          { ...STATS[1], value: compact(stats.interactions) },
          { ...STATS[2], value: compact(stats.spoilers) },
          { ...STATS[3], value: compact(stats.reports) },
        ]
      : STATS;

  const setTabReset = (k: (typeof TABS)[number]["key"]) => {
    setTab(k);
    setPage(1);
  };

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6 md:px-6">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-primary/30 to-accent/20 text-primary ring-1 ring-primary/30">
            <Award className="size-7" />
          </span>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight md:text-3xl">Quality Leadership Board</h1>
            <p className="mt-1 max-w-xl text-[13.5px] text-muted">
              Recognizing members who create the best experience in our community.
            </p>
            <button
              onClick={() => setShowInfo((v) => !v)}
              className="mt-1.5 inline-flex items-center gap-1.5 text-[13px] font-semibold text-primary hover:text-primary-strong"
            >
              Learn how scoring works <Info className="size-3.5" />
            </button>
            {showInfo && (
              <p className="mt-2 max-w-xl rounded-xl border border-border bg-white/[0.03] p-3 text-[12.5px] leading-relaxed text-muted">
                Quality Score blends helpful interactions, spoiler saves (correctly tagging or hiding spoilers),
                and resolved reports, weighted toward kindness and keeping rooms spoiler-safe. It refreshes for
                the selected period.
              </p>
            )}
          </div>
        </div>

        <div className="text-right">
          <div className="relative inline-block">
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value as (typeof PERIODS)[number])}
              aria-label="Time period"
              className="appearance-none rounded-xl border border-border bg-white/[0.03] py-2.5 pl-9 pr-9 text-[14px] font-semibold text-foreground outline-none transition hover:border-primary/50 focus:border-primary/60"
            >
              {PERIODS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
            <Calendar className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-2" />
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-2" />
          </div>
          <p className="mt-1.5 text-[12px] text-muted-2">Ranked by activity for {period.toLowerCase()}.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-5 flex flex-wrap gap-1 border-b border-border">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTabReset(t.key)}
            className={cn(
              "relative px-4 py-2.5 text-[14px] font-semibold transition-colors",
              tab === t.key ? "text-foreground" : "text-muted-2 hover:text-foreground",
            )}
          >
            {t.label}
            {tab === t.key && <span className="absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-primary" />}
          </button>
        ))}
      </div>

      {/* Stat cards */}
      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="glass rounded-2xl border border-border-soft p-5">
              <div className="flex items-center gap-3">
                <span className={cn("grid size-12 shrink-0 place-items-center rounded-2xl", s.tone)}>
                  <Icon className="size-5" />
                </span>
                <div className="min-w-0">
                  <p className="text-[13px] text-muted-2">{s.label}</p>
                  <p className="text-[26px] font-extrabold leading-tight">{s.value}</p>
                </div>
              </div>
              <p className="mt-2 text-[12px] font-semibold text-muted">{s.sub}</p>
            </div>
          );
        })}
      </div>

      {/* Table */}
      <div className="glass overflow-hidden rounded-2xl border border-border-soft">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] text-left">
            <thead>
              <tr className="border-b border-border text-[11px] uppercase tracking-wide text-muted-2">
                <th className="px-5 py-3 font-semibold">Rank</th>
                <th className="px-3 py-3 font-semibold">Member</th>
                <th className="px-3 py-3 font-semibold">
                  <span className="inline-flex items-center gap-1 text-primary">
                    Quality Score <ArrowDown className="size-3" />
                  </span>
                </th>
                <th className="px-3 py-3 font-semibold">Helpful Interactions</th>
                <th className="px-3 py-3 font-semibold">Spoiler Saves</th>
                <th className="px-3 py-3 font-semibold">Reports Resolved</th>
                <th className="px-3 py-3 font-semibold">Badges</th>
                <th className="px-3 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-14 text-center">
                    <Award className="mx-auto mb-3 size-8 text-muted-2" />
                    <p className="text-sm font-semibold">No leaders yet</p>
                    <p className="mx-auto mt-1 max-w-sm text-[13px] text-muted-2">
                      The board is live and ranks real members. As people review, discuss and keep rooms
                      spoiler-safe, they&apos;ll climb the ranks here.
                    </p>
                  </td>
                </tr>
              ) : (
                rows.map((m, i) => {
                  const rank = start + i + 1;
                  return <Row key={m.id} member={m} rank={rank} />;
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-5 py-4">
          <p className="flex items-center gap-2 text-[13px] text-muted">
            <Trophy className="size-4 text-warn" /> Keep it up! Your positive impact makes Watchruum an amazing place
            for everyone.
          </p>
          <Pager page={Math.min(page, pages)} pages={pages} onChange={setPage} />
        </div>
      </div>
    </div>
  );
}

/* ---------------- row ---------------- */

function medal(rank: number): string | null {
  if (rank === 1) return "from-yellow-400/30 to-amber-500/20 text-yellow-300 ring-yellow-400/40";
  if (rank === 2) return "from-slate-300/30 to-slate-400/20 text-slate-200 ring-slate-300/40";
  if (rank === 3) return "from-orange-500/30 to-amber-700/20 text-orange-300 ring-orange-400/40";
  return null;
}

function Row({ member, rank }: { member: Member; rank: number }) {
  const pct = Math.min(99, Math.ceil(rank / 3));
  const m = medal(rank);
  return (
    <tr className="border-b border-border/60 last:border-0 hover:bg-white/[0.02]">
      <td className="px-5 py-3">
        {m ? (
          <span className={cn("grid size-8 place-items-center rounded-full bg-gradient-to-br text-[13px] font-extrabold ring-1", m)}>
            {rank}
          </span>
        ) : (
          <span className="pl-2 text-[14px] font-bold text-muted-2">{rank}</span>
        )}
      </td>
      <td className="px-3 py-3">
        <div className="flex items-center gap-3">
          <span
            className="grid size-10 shrink-0 place-items-center rounded-lg text-[13px] font-bold text-white ring-1 ring-white/10"
            style={{ background: posterGradient(member.name) }}
          >
            {initials(member.name)}
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="truncate text-[14px] font-bold">{member.name}</p>
              {member.role && (
                <span
                  className={cn(
                    "rounded-md px-1.5 py-0.5 text-[10px] font-bold",
                    member.role === "Mod" ? "bg-primary/20 text-primary" : "bg-accent/20 text-accent",
                  )}
                >
                  {member.role}
                </span>
              )}
            </div>
            <p className="text-[11.5px] text-muted-2">Top {pct}% of community</p>
          </div>
        </div>
      </td>
      <td className="px-3 py-3 text-[15px] font-extrabold text-primary">{compact(member.quality)}</td>
      <td className="px-3 py-3 text-[14px] font-semibold">{member.helpful.toLocaleString("en-US")}</td>
      <td className="px-3 py-3 text-[14px] font-semibold">{member.spoiler.toLocaleString("en-US")}</td>
      <td className="px-3 py-3 text-[14px] font-semibold">{member.reports.toLocaleString("en-US")}</td>
      <td className="px-3 py-3">
        <div className="flex items-center gap-1.5">
          {member.badges.map((b, idx) => {
            const Bdg = BADGES[b].icon;
            return (
              <span key={idx} className={cn("grid size-7 place-items-center rounded-lg ring-1", BADGES[b].color)}>
                <Bdg className="size-3.5" />
              </span>
            );
          })}
          <span className="text-[12px] font-bold text-muted-2">+{member.extra}</span>
        </div>
      </td>
      <td className="px-3 py-3">
        <Link
          href={`/u/${member.name}`}
          className="inline-flex items-center rounded-lg border border-border bg-white/[0.03] px-3 py-1.5 text-[12.5px] font-semibold text-foreground transition hover:border-primary/50 hover:text-primary"
        >
          View Profile
        </Link>
      </td>
    </tr>
  );
}

/* ---------------- pager ---------------- */

function Pager({
  page,
  pages,
  onChange,
}: {
  page: number;
  pages: number;
  onChange: (p: number) => void;
}) {
  const nums: (number | "…")[] = [];
  const push = (n: number | "…") => nums.push(n);
  push(1);
  if (page > 3) push("…");
  for (let n = Math.max(2, page - 1); n <= Math.min(pages - 1, page + 1); n++) push(n);
  if (page < pages - 2) push("…");
  if (pages > 1) push(pages);

  const btn = "grid h-9 min-w-9 place-items-center rounded-lg border border-border px-2 text-[13px] font-semibold transition";

  return (
    <div className="flex items-center gap-1.5">
      <button
        onClick={() => onChange(Math.max(1, page - 1))}
        disabled={page === 1}
        aria-label="Previous page"
        className={cn(btn, "text-muted-2 enabled:hover:text-foreground disabled:opacity-40")}
      >
        <ChevronLeft className="size-4" />
      </button>
      {nums.map((n, i) =>
        n === "…" ? (
          <span key={`e${i}`} className="px-1 text-muted-2">
            …
          </span>
        ) : (
          <button
            key={n}
            onClick={() => onChange(n)}
            className={cn(
              btn,
              n === page ? "border-primary bg-primary/15 text-primary" : "text-muted enabled:hover:text-foreground",
            )}
          >
            {n}
          </button>
        ),
      )}
      <button
        onClick={() => onChange(Math.min(pages, page + 1))}
        disabled={page === pages}
        aria-label="Next page"
        className={cn(btn, "text-muted-2 enabled:hover:text-foreground disabled:opacity-40")}
      >
        <ChevronRight className="size-4" />
      </button>
    </div>
  );
}
