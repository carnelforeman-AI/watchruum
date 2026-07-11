"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  Flag,
  ShieldAlert,
  CheckCircle2,
  Users,
  MessageSquare,
  ChevronRight,
  Megaphone,
  Settings,
  Timer,
  Lock,
  Eraser,
  ScrollText,
  ShieldCheck,
  ArrowUp,
  ArrowDown,
  LifeBuoy,
} from "lucide-react";
import { Sparkline } from "@/components/admin/charts";
import { cn } from "@/lib/utils";
import { modSetReportStatus } from "@/app/mod-actions";
import type { ModDashboard as ModData, ModReportRow } from "@/lib/moderator";

const STAT_ICONS: Record<string, { icon: React.ComponentType<{ className?: string }>; tone: string }> = {
  new: { icon: Flag, tone: "bg-primary/15 text-primary ring-primary/25" },
  open: { icon: ShieldAlert, tone: "bg-warn/15 text-warn ring-warn/25" },
  resolved: { icon: CheckCircle2, tone: "bg-safe/15 text-safe ring-safe/25" },
  members: { icon: Users, tone: "bg-accent/15 text-accent ring-accent/25" },
  comments: { icon: MessageSquare, tone: "bg-primary/15 text-primary ring-primary/25" },
};

function toneChip(tone: string): string {
  switch (tone) {
    case "primary": return "bg-primary/20 text-primary";
    case "danger": return "bg-danger/20 text-danger";
    case "warn": return "bg-warn/20 text-warn";
    case "accent-2": return "bg-accent-2/20 text-accent-2";
    default: return "bg-accent/20 text-accent";
  }
}
function toneText(tone: string): string {
  switch (tone) {
    case "primary": return "text-primary";
    case "danger": return "text-danger";
    case "warn": return "text-warn";
    case "accent-2": return "text-accent-2";
    default: return "text-accent";
  }
}
function toneDot(tone: string): string {
  switch (tone) {
    case "primary": return "bg-primary";
    case "danger": return "bg-danger";
    case "warn": return "bg-warn";
    case "accent-2": return "bg-accent-2";
    default: return "bg-accent";
  }
}

// Deterministic little sparkline series (no randomness → no hydration drift).
function series(seed: number): number[] {
  const base = [5, 7, 6, 8, 7, 9, 6, 8, 10, 7, 9, 8];
  return base.map((v, i) => v + ((seed + i * 3) % 5));
}

const TOOLS = [
  { label: "Send Announcement", icon: Megaphone, href: "/mod/announcements" },
  { label: "Room Settings", icon: Settings, href: "/mod/rooms" },
  { label: "Slow Mode", icon: Timer, href: "/mod/rooms" },
  { label: "Lock Room", icon: Lock, href: "/mod/rooms" },
  { label: "Clear Chat", icon: Eraser, href: "/mod/rooms" },
  { label: "Mod Logs", icon: ScrollText, href: "/mod/logs" },
];

export function ModDashboard({ data }: { data: ModData }) {
  const [reports, setReports] = useState<ModReportRow[]>(data.reports);
  const [, start] = useTransition();

  function actOn(id: string, status: "reviewing" | "dismissed") {
    setReports((rs) => rs.filter((r) => r.id !== id));
    // Demo rows (ids like "d1") have no DB record — skip the server call.
    if (!/^[0-9a-f-]{36}$/i.test(id)) return;
    start(() => {
      void modSetReportStatus(id, status);
    });
  }

  return (
    <div className="mx-auto max-w-[1500px]">
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-2xl font-extrabold tracking-tight">Dashboard Overview</h1>
        <span
          className={cn(
            "rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide",
            data.live ? "bg-safe/20 text-safe" : "bg-warn/20 text-warn",
          )}
        >
          {data.live ? "Real numbers" : "Seeded demo"}
        </span>
      </div>

      {/* Stat cards */}
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        {data.stats.map((s) => {
          const ic = STAT_ICONS[s.key] ?? STAT_ICONS.comments;
          const Icon = ic.icon;
          return (
            <div key={s.key} className="glass flex items-center gap-3 rounded-2xl p-4">
              <span className={cn("grid size-11 shrink-0 place-items-center rounded-xl ring-1", ic.tone)}>
                <Icon className="size-5" />
              </span>
              <div className="min-w-0">
                <p className="text-2xl font-extrabold leading-none">{s.value}</p>
                <p className="mt-0.5 text-[12px] font-semibold">{s.label}</p>
                <p className="truncate text-[11px] text-muted-2">{s.sub}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_300px]">
        {/* Reports Needing Attention */}
        <section className="glass rounded-2xl p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-bold">Reports Needing Attention</h2>
            <Link href="/mod/reports" className="text-[12px] font-semibold text-primary hover:underline">
              View all
            </Link>
          </div>

          {reports.length === 0 ? (
            <div className="grid place-items-center py-12 text-center">
              <CheckCircle2 className="mb-2 size-8 text-safe" />
              <p className="font-semibold">All clear</p>
              <p className="mt-1 text-[13px] text-muted-2">No reports need your attention right now.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {reports.map((r) => (
                <div key={r.id} className="rounded-xl border border-border bg-white/[0.02] p-3.5">
                  <div className="flex items-start gap-3">
                    <span className={cn("grid size-10 shrink-0 place-items-center rounded-lg", toneChip(r.tone))}>
                      <Flag className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-[14px] font-bold">{r.title}</p>
                        {r.isNew && (
                          <span className="rounded bg-danger/20 px-1.5 py-0.5 text-[10px] font-bold text-danger">New</span>
                        )}
                        <span className={cn("ml-auto rounded-md px-2 py-0.5 text-[11px] font-bold", toneChip(r.tone))}>
                          {r.category}
                        </span>
                      </div>
                      <p className="mt-0.5 text-[12px] text-muted-2">in {r.room}</p>
                      <p className="mt-1 truncate text-[13px] italic text-foreground/80">&ldquo;{r.snippet}&rdquo;</p>
                      <p className="mt-1 text-[11.5px] text-muted-2">
                        Reported by {r.reporter} · {r.when}
                      </p>
                      <div className="mt-2.5 flex gap-2">
                        <button
                          onClick={() => actOn(r.id, "reviewing")}
                          className="rounded-lg bg-gradient-to-r from-primary to-primary-strong px-3 py-1.5 text-[12px] font-bold text-white transition-opacity hover:opacity-90"
                        >
                          Review
                        </button>
                        <button
                          onClick={() => actOn(r.id, "dismissed")}
                          className="rounded-lg border border-border bg-white/[0.03] px-3 py-1.5 text-[12px] font-semibold text-muted transition-colors hover:text-foreground"
                        >
                          Dismiss
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <Link
            href="/mod/reports"
            className="mt-4 flex items-center justify-center gap-1.5 text-[13px] font-semibold text-primary hover:underline"
          >
            View all reports <ChevronRight className="size-4" />
          </Link>
        </section>

        {/* Active Rooms */}
        <section className="glass rounded-2xl p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-bold">Active Rooms</h2>
            <Link href="/mod/rooms" className="text-[12px] font-semibold text-primary hover:underline">
              View all
            </Link>
          </div>
          <div className="space-y-2.5">
            {data.rooms.map((room, i) => (
              <div key={room.id} className="flex items-center gap-3 rounded-xl border border-border bg-white/[0.02] p-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary/15 text-primary">
                  <MessageSquare className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13.5px] font-semibold">{room.title}</p>
                  <p className="text-[11.5px] text-muted-2">
                    {room.members} members · {room.online} online
                  </p>
                </div>
                <Sparkline data={series(i + 2)} tone="var(--color-safe)" />
                <div className="w-12 shrink-0 text-right">
                  <p className={cn("text-[15px] font-extrabold", room.alerts > 0 ? "text-danger" : "text-safe")}>
                    {room.alerts}
                  </p>
                  <p className="text-[10px] text-muted-2">{room.alerts === 1 ? "Alert" : "Alerts"}</p>
                </div>
              </div>
            ))}
          </div>
          <Link
            href="/mod/rooms"
            className="mt-4 flex items-center justify-center gap-1.5 text-[13px] font-semibold text-primary hover:underline"
          >
            View all rooms <ChevronRight className="size-4" />
          </Link>
        </section>

        {/* Right rail */}
        <aside className="space-y-5">
          {/* Moderator tools */}
          <div className="glass rounded-2xl p-5">
            <h2 className="mb-3 text-base font-bold">Moderator Tools</h2>
            <div className="grid grid-cols-3 gap-2">
              {TOOLS.map((t) => {
                const Icon = t.icon;
                return (
                  <Link
                    key={t.label}
                    href={t.href}
                    className="flex flex-col items-center gap-1.5 rounded-xl border border-border bg-white/[0.03] px-2 py-3 text-center text-[11px] font-semibold text-muted transition-colors hover:bg-white/[0.07] hover:text-foreground"
                  >
                    <Icon className="size-4 text-primary" />
                    {t.label}
                  </Link>
                );
              })}
            </div>
            <Link
              href="/mod/announcements"
              className="mt-3 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-primary-strong px-4 py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90"
            >
              <Megaphone className="size-4" /> Create Announcement
            </Link>
          </div>

          {/* Recent mod actions */}
          <div className="glass rounded-2xl p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-bold">Recent Mod Actions</h2>
              <Link href="/mod/logs" className="text-[12px] font-semibold text-primary hover:underline">
                View all
              </Link>
            </div>
            {data.actions.length === 0 ? (
              <p className="py-4 text-center text-[13px] text-muted-2">No recent actions.</p>
            ) : (
              <ul className="space-y-3">
                {data.actions.map((a) => (
                  <li key={a.id} className="flex items-start gap-2.5">
                    <span className={cn("mt-1 size-2 shrink-0 rounded-full", toneDot(a.tone))} />
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-semibold">{a.actor}</p>
                      <p className="text-[12px] text-muted-2">{a.action}</p>
                      <p className="text-[11px] text-muted-2">{a.when}</p>
                    </div>
                    <ShieldCheck className={cn("size-4 shrink-0", toneText(a.tone))} />
                  </li>
                ))}
              </ul>
            )}
            <Link
              href="/mod/logs"
              className="mt-3 flex items-center justify-center gap-1.5 text-[13px] font-semibold text-primary hover:underline"
            >
              View all mod logs <ChevronRight className="size-4" />
            </Link>
          </div>

          {/* Need help */}
          <div className="glass rounded-2xl p-5">
            <h2 className="text-base font-bold">Need Help?</h2>
            <p className="mt-1 text-[12.5px] text-muted">Our moderator team is here for you.</p>
            <Link
              href="/mod/guide"
              className="mt-3 flex items-center justify-center gap-2 rounded-xl border border-border bg-white/[0.03] px-4 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-white/[0.07]"
            >
              <LifeBuoy className="size-4 text-primary" /> Contact Admin Team
            </Link>
          </div>
        </aside>
      </div>

      {/* Community Health */}
      <section className="glass mt-5 rounded-2xl p-5">
        <div className="mb-4 flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-xl bg-primary/15 text-primary ring-1 ring-primary/25">
            <ShieldCheck className="size-5" />
          </span>
          <div>
            <h2 className="text-base font-bold">Community Health</h2>
            <p className="text-[12.5px] text-muted-2">Helping keep Watchruum a safe and positive place.</p>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {data.health.map((m, i) => (
            <div key={m.key} className="rounded-2xl border border-border bg-white/[0.02] p-4">
              <p className="text-[13px] font-medium text-muted">{m.label}</p>
              <div className="mt-1 flex items-center gap-2">
                <p className="text-2xl font-extrabold">{m.value}</p>
                {m.deltaPct > 0 && (
                  <span className={cn("flex items-center gap-0.5 text-[12px] font-bold", m.good ? "text-safe" : "text-danger")}>
                    {m.up ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />}
                    {m.deltaPct}%
                  </span>
                )}
              </div>
              <p className="text-[11px] text-muted-2">vs last 7 days</p>
              <div className="mt-2">
                <Sparkline data={series(i + 5)} tone="var(--color-primary)" />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
