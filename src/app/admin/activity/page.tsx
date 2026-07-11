import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  Calendar,
  ChevronDown,
  UserPlus,
  MessageSquare,
  Clapperboard,
  Star,
  Flag,
} from "lucide-react";
import { getActivityDetail } from "@/lib/admin";
import { ActivityChart } from "@/components/admin/activity-chart";
import { compact } from "@/lib/utils";

export const metadata = { title: "Admin · Activity · Watchruum" };
export const dynamic = "force-dynamic";

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  users: UserPlus,
  messages: MessageSquare,
  rooms: Clapperboard,
  reviews: Star,
  reports: Flag,
};

export default async function AdminActivityPage() {
  const a = await getActivityDetail();
  if (!a.isAdmin) notFound();

  return (
    <div className="mx-auto max-w-[1100px]">
      <Link
        href="/admin"
        className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-semibold text-muted transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Back to Overview
      </Link>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold tracking-tight">Activity</h1>
            <span
              className={
                a.live
                  ? "rounded-full bg-safe/20 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-safe"
                  : "rounded-full bg-warn/20 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-warn"
              }
            >
              {a.live ? "Real numbers" : "Seeded demo"}
            </span>
          </div>
          <p className="mt-1 text-[13px] text-muted-2">Overview of platform activity over the last 7 days.</p>
        </div>

        <span className="inline-flex items-center gap-2 rounded-xl border border-border bg-white/[0.03] px-3.5 py-2.5 text-[14px] font-semibold text-muted">
          <Calendar className="size-4 text-muted-2" /> Last 7 days
          <ChevronDown className="size-4 text-muted-2" />
        </span>
      </div>

      {/* Metric cards */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {a.metrics.map((m) => {
          const Icon = ICONS[m.key] ?? Star;
          const up = (m.deltaPct ?? 0) >= 0;
          return (
            <div key={m.key} className="glass rounded-2xl p-4">
              <span className="grid size-9 place-items-center rounded-xl bg-primary/15 text-primary ring-1 ring-primary/25">
                <Icon className="size-4" />
              </span>
              <p className="mt-3 text-2xl font-extrabold leading-none">{compact(m.value)}</p>
              <p className="mt-1 text-[12px] text-muted-2">{m.label}</p>
              {m.deltaPct != null ? (
                <p
                  className={`mt-1 flex items-center gap-1 text-[11px] font-semibold ${
                    up ? "text-safe" : "text-danger"
                  }`}
                >
                  {up ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />}
                  {Math.abs(m.deltaPct)}%
                </p>
              ) : (
                <p className="mt-1 text-[11px] font-medium text-muted-2">&nbsp;</p>
              )}
            </div>
          );
        })}
      </div>

      {/* Chart */}
      <div className="glass rounded-2xl p-5 md:p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold">Activity</h2>
          <span className="text-[11px] text-muted-2">Last 7 days</span>
        </div>
        <ActivityChart points={a.series} />
      </div>

      {/* Breakdown */}
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {a.breakdown.map((s) => (
          <div key={s.key} className="glass rounded-2xl p-4">
            <p className="flex items-center gap-2 text-[13px] font-medium text-muted">
              <span className="size-2.5 rounded-full" style={{ background: s.color }} />
              {s.label}
            </p>
            <p className="mt-2 text-[18px] font-extrabold leading-none">
              {s.value.toLocaleString()}{" "}
              <span className="text-[12px] font-semibold text-muted-2">({s.pct}%)</span>
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
