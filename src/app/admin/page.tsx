import Link from "next/link";
import {
  Users,
  Star,
  MessageSquare,
  Film,
  Flag,
  TrendingUp,
  Megaphone,
  Clapperboard,
  Mail,
  UserPlus,
  ShieldAlert,
  CheckCircle2,
} from "lucide-react";
import { AreaChart, Donut } from "@/components/admin/charts";
import { ContentOverview } from "@/components/admin/content-overview";
import { LiveModeToggle } from "@/components/admin/live-mode-toggle";
import { Badge } from "@/components/ui/badge";
import { getAdminOverview } from "@/lib/admin";
import { getLiveMode } from "@/lib/settings";
import { timeAgo } from "@/lib/utils";

export const metadata = { title: "Admin · Overview · Watchruum" };
export const dynamic = "force-dynamic";

const STAT_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  users: Users,
  reviews: Star,
  comments: MessageSquare,
  titles: Film,
  reports: Flag,
};

export default async function AdminOverviewPage() {
  const [o, live] = await Promise.all([getAdminOverview(), getLiveMode()]);

  return (
    <div className="mx-auto max-w-[1400px]">
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold tracking-tight">Overview</h1>
        <p className="text-[13px] text-muted-2">Welcome back — here&apos;s what&apos;s happening on Watchruum.</p>
      </div>

      <div className="flex flex-col gap-6 xl:flex-row">
        {/* Main column */}
        <div className="min-w-0 flex-1 space-y-6">
          {/* Stat cards */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {o.stats.map((s) => {
              const Icon = STAT_ICONS[s.key] ?? TrendingUp;
              return (
                <div key={s.key} className="glass rounded-2xl p-4">
                  <span className="grid size-9 place-items-center rounded-xl bg-primary/15 text-primary ring-1 ring-primary/25">
                    <Icon className="size-4" />
                  </span>
                  <p className="mt-3 text-2xl font-extrabold">{s.value.toLocaleString()}</p>
                  <p className="text-[12px] text-muted-2">{s.label}</p>
                  <p className="mt-1 text-[11px] font-medium text-safe">
                    {s.delta != null ? `+${s.delta} this week` : " "}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Charts */}
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="glass rounded-2xl p-5">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-base font-semibold">Activity</h3>
                <span className="text-[11px] text-muted-2">Last 7 days</span>
              </div>
              <AreaChart data={o.activitySeries} />
            </div>
            <div className="glass rounded-2xl p-5">
              <h3 className="mb-4 text-base font-semibold">User Breakdown</h3>
              <Donut slices={o.breakdown} total={o.totalUsers} />
            </div>
          </div>

          {/* Content overview */}
          <ContentOverview shows={o.trendingShows} movies={o.trendingMovies} rooms={o.activeRooms} />

          {/* Recent reports */}
          <div className="glass rounded-2xl p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-semibold">Recent Reports</h3>
              <Link href="/admin/reports" className="text-[12px] font-semibold text-primary hover:underline">
                View all reports
              </Link>
            </div>
            {o.recentReports.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-2">No reports yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[13px]">
                  <thead>
                    <tr className="border-b border-border text-[11px] uppercase tracking-wide text-muted-2">
                      <th className="pb-2 pr-4 font-semibold">Type</th>
                      <th className="pb-2 pr-4 font-semibold">Content</th>
                      <th className="pb-2 pr-4 font-semibold">Reported By</th>
                      <th className="pb-2 pr-4 font-semibold">Reason</th>
                      <th className="pb-2 pr-4 font-semibold">Time</th>
                      <th className="pb-2 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {o.recentReports.map((r) => (
                      <tr key={r.id} className="border-b border-border/60 last:border-0">
                        <td className="py-2.5 pr-4">
                          <span className="inline-flex items-center gap-1.5 text-muted">
                            <Flag className="size-3.5 text-danger" /> {r.type === "review" ? "Review" : "Post"}
                          </span>
                        </td>
                        <td className="max-w-[200px] truncate py-2.5 pr-4 font-medium">{r.content}</td>
                        <td className="py-2.5 pr-4 text-muted">{r.reporter}</td>
                        <td className="max-w-[180px] truncate py-2.5 pr-4 text-muted">{r.reason}</td>
                        <td className="whitespace-nowrap py-2.5 pr-4 text-muted-2">{timeAgo(r.created_at)}</td>
                        <td className="py-2.5">
                          <StatusBadge status={r.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right rail */}
        <aside className="w-full shrink-0 space-y-4 xl:w-80">
          {/* Go Live switch */}
          <LiveModeToggle initialLive={live} />

          {/* Quick actions */}
          <div className="glass rounded-2xl p-5">
            <h3 className="mb-3 text-base font-semibold">Quick Actions</h3>
            <div className="grid grid-cols-2 gap-2">
              <QuickAction icon={Megaphone} label="Announce" href="/admin/announcements" />
              <QuickAction icon={Clapperboard} label="Create Room" href="/admin/rooms" />
              <QuickAction icon={Film} label="Add Content" href="/admin/content" />
              <QuickAction icon={Users} label="Manage Users" href="/admin/users" />
              <QuickAction icon={Flag} label="View Reports" href="/admin/reports" />
              <QuickAction icon={Mail} label="Send Email" href="/admin/email-templates" />
            </div>
          </div>

          {/* Recent activity */}
          <div className="glass rounded-2xl p-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-base font-semibold">Recent Activity</h3>
              <Link href="/admin/audit" className="text-[12px] font-semibold text-primary hover:underline">
                View all
              </Link>
            </div>
            {o.recentActivity.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-2">Nothing yet.</p>
            ) : (
              <ul className="space-y-3.5">
                {o.recentActivity.map((e) => {
                  const Icon = e.kind === "user" ? UserPlus : e.kind === "review" ? Star : Flag;
                  return (
                    <li key={e.id} className="flex items-start gap-3">
                      <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg bg-white/5 text-muted">
                        <Icon className="size-3.5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-medium leading-tight">{e.title}</p>
                        <p className="truncate text-[12px] text-muted-2">{e.subtitle}</p>
                      </div>
                      <span className="shrink-0 text-[11px] text-muted-2">{timeAgo(e.created_at)}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* System status */}
          <div className="glass rounded-2xl p-5">
            <h3 className="mb-3 text-base font-semibold">System Status</h3>
            <ul className="space-y-2.5 text-[13px]">
              {["API", "Database", "Storage", "Auth (Google)", "TMDb"].map((svc) => (
                <li key={svc} className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-muted">
                    <span className="size-2 rounded-full bg-safe" /> {svc}
                  </span>
                  <span className="font-semibold text-safe">Operational</span>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}

function QuickAction({
  icon: Icon,
  label,
  href,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="flex flex-col items-center gap-1.5 rounded-xl border border-border bg-white/[0.03] px-2 py-3 text-center text-[12px] font-semibold text-muted transition-colors hover:bg-white/[0.07] hover:text-foreground"
    >
      <Icon className="size-4 text-primary" />
      {label}
    </Link>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "resolved")
    return (
      <Badge variant="safe">
        <CheckCircle2 className="size-3" /> Resolved
      </Badge>
    );
  if (status === "dismissed") return <Badge variant="neutral">Dismissed</Badge>;
  if (status === "reviewing") return <Badge variant="warn">Reviewing</Badge>;
  return (
    <Badge variant="danger">
      <ShieldAlert className="size-3" /> New
    </Badge>
  );
}
