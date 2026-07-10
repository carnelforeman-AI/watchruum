import Link from "next/link";
import { Send, Mail, CheckCircle2, MousePointerClick, FileText, MoreVertical, ArrowRight } from "lucide-react";
import { Poster } from "@/components/media/poster";
import { PushComposer } from "@/components/admin/push-composer";
import { getPushOverview, type PushStat, type PushRow } from "@/lib/admin";

export const metadata = { title: "Admin · Push Notifications · Watchruum" };
export const dynamic = "force-dynamic";

const TONE: Record<PushStat["tone"], string> = {
  primary: "bg-primary/15 text-primary",
  blue: "bg-[#3b82f6]/15 text-[#3b82f6]",
  green: "bg-safe/15 text-safe",
  orange: "bg-[#f59e0b]/15 text-[#f59e0b]",
};
const STAT_ICON = { send: Send, mail: Mail, check: CheckCircle2, click: MousePointerClick };

export default async function AdminPushPage() {
  const { stats, recent } = await getPushOverview();

  return (
    <div className="mx-auto max-w-[1400px]">
      {/* header */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Push Notifications</h1>
          <p className="text-[13px] text-muted-2">Compose and schedule push notifications.</p>
        </div>
        <div className="flex items-center gap-2.5">
          <Link
            href="/admin/email-templates"
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-white/[0.03] px-4 py-2.5 text-[14px] font-semibold text-foreground transition hover:bg-white/[0.06]"
          >
            <FileText className="size-4" /> Templates
          </Link>
          <PushComposer />
        </div>
      </div>

      {/* stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((s) => {
          const Icon = STAT_ICON[s.icon];
          return (
            <div key={s.key} className="glass rounded-2xl border border-border-soft p-5">
              <div className="flex items-center gap-3">
                <span className={`grid size-12 shrink-0 place-items-center rounded-2xl ${TONE[s.tone]}`}>
                  <Icon className="size-5" />
                </span>
                <div className="min-w-0">
                  <p className="text-[13px] text-muted-2">{s.label}</p>
                  <p className="text-[26px] font-extrabold leading-tight">{s.value.toLocaleString("en-US")}</p>
                </div>
              </div>
              <p className="mt-2 text-[12px] font-semibold text-safe">{s.sub}</p>
            </div>
          );
        })}
      </div>

      {/* recent table */}
      <div className="glass mt-5 rounded-2xl border border-border-soft">
        <div className="border-b border-border px-5 py-4">
          <h2 className="text-[17px] font-bold">Recent Push Notifications</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left">
            <thead>
              <tr className="text-[11px] uppercase tracking-wide text-muted-2">
                <th className="px-5 py-3 font-semibold">Title</th>
                <th className="px-3 py-3 font-semibold">Audience</th>
                <th className="px-3 py-3 font-semibold">Sent</th>
                <th className="px-3 py-3 font-semibold">Delivered</th>
                <th className="px-3 py-3 font-semibold">Opened</th>
                <th className="px-3 py-3 font-semibold">Clicked</th>
                <th className="px-3 py-3 font-semibold">Status</th>
                <th className="px-3 py-3" />
              </tr>
            </thead>
            <tbody>
              {recent.map((r) => (
                <PushTableRow key={r.id} row={r} />
              ))}
            </tbody>
          </table>
        </div>

        <div className="border-t border-border px-5 py-4 text-center">
          <Link
            href="#"
            className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-primary hover:underline"
          >
            View All Push Notifications <ArrowRight className="size-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}

function PushTableRow({ row }: { row: PushRow }) {
  return (
    <tr className="border-b border-border/60 last:border-0 hover:bg-white/[0.02]">
      <td className="px-5 py-3">
        <div className="flex items-center gap-3">
          <Poster
            title={row.title}
            src={row.poster}
            genres={row.genres}
            showTitle={false}
            rounded="rounded-lg"
            className="size-11 shrink-0 ring-1 ring-white/10"
          />
          <div className="min-w-0">
            <p className="truncate text-[14px] font-bold">{row.title}</p>
            <p className="truncate text-[12px] text-muted-2">{row.subtitle}</p>
          </div>
        </div>
      </td>
      <td className="px-3 py-3">
        <p className="text-[13px] font-medium">{row.audience}</p>
        <p className="text-[12px] text-muted-2">{row.audienceCount.toLocaleString("en-US")}</p>
      </td>
      <td className="px-3 py-3">
        <p className="text-[13px] font-medium">{row.sentDate}</p>
        <p className="text-[12px] text-muted-2">{row.sentTime}</p>
      </td>
      <MetricCell value={row.delivered} pct={row.deliveredPct} />
      <MetricCell value={row.opened} pct={row.openedPct} />
      <MetricCell value={row.clicked} pct={row.clickedPct} />
      <td className="px-3 py-3">
        <span className="inline-flex items-center rounded-md border border-safe/30 bg-safe/10 px-2 py-1 text-[11px] font-semibold text-safe">
          {row.status}
        </span>
      </td>
      <td className="px-3 py-3">
        <button
          aria-label="Row actions"
          className="grid size-7 place-items-center rounded-lg text-muted-2 transition hover:bg-white/5 hover:text-foreground"
        >
          <MoreVertical className="size-4" />
        </button>
      </td>
    </tr>
  );
}

function MetricCell({ value, pct }: { value: number; pct: number }) {
  return (
    <td className="px-3 py-3">
      <p className="text-[13px] font-bold">{value.toLocaleString("en-US")}</p>
      <p className="text-[12px] font-medium text-safe">{pct}%</p>
    </td>
  );
}
