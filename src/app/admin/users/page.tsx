import Link from "next/link";
import {
  Users as UsersIcon,
  UserCheck,
  UserPlus,
  UserMinus,
  Ban,
  Search,
  SlidersHorizontal,
  Columns3,
  ChevronDown,
  Plus,
  Download,
  Upload,
  Mail,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Donut, AreaChart } from "@/components/admin/charts";
import { UserActionsMenu } from "@/components/admin/user-actions-menu";
import { getAdminUsers } from "@/lib/admin";
import { timeAgo, compact } from "@/lib/utils";

const STATUS_BADGE: Record<string, { variant: "safe" | "warn" | "danger" | "neutral"; label: string }> = {
  active: { variant: "safe", label: "Active" },
  muted: { variant: "warn", label: "Muted" },
  limited: { variant: "warn", label: "Limited" },
  suspended: { variant: "warn", label: "Suspended" },
  banned: { variant: "danger", label: "Banned" },
};

export const metadata = { title: "Admin · Users · Watchruum" };
export const dynamic = "force-dynamic";

const TABS = [
  { key: "all", label: "All Users" },
  { key: "active", label: "Active" },
  { key: "new", label: "New Users" },
  { key: "suspended", label: "Suspended" },
  { key: "banned", label: "Banned" },
];

function joinedLabel(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function activeDot(iso: string | null) {
  if (!iso) return "bg-muted-2";
  const days = (Date.now() - new Date(iso).getTime()) / 86400000;
  if (days < 1) return "bg-safe";
  if (days < 7) return "bg-warn";
  return "bg-danger";
}

type SP = Record<string, string | string[] | undefined>;
const val = (sp: SP, k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : undefined);

export default async function AdminUsersPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const q = val(sp, "q") ?? "";
  const tab = val(sp, "tab") ?? "all";
  const role = val(sp, "role") ?? "all";
  const page = Math.max(1, Number(val(sp, "page") ?? "1") || 1);

  const data = await getAdminUsers({ q, tab, role, page, perPage: 10 });
  const { rows, total, perPage, stats } = data;

  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const start = total === 0 ? 0 : (page - 1) * perPage + 1;
  const end = Math.min(total, page * perPage);

  const qs = (over: Record<string, string | number>) => {
    const p = new URLSearchParams();
    const merged = { q, tab, role, page, ...over };
    if (merged.q) p.set("q", String(merged.q));
    if (merged.tab && merged.tab !== "all") p.set("tab", String(merged.tab));
    if (merged.role && merged.role !== "all") p.set("role", String(merged.role));
    if (merged.page && Number(merged.page) > 1) p.set("page", String(merged.page));
    const s = p.toString();
    return s ? `/admin/users?${s}` : "/admin/users";
  };

  const statCards = [
    { icon: UsersIcon, label: "Total Users", value: stats.total, delta: stats.newUsers, tone: "text-primary bg-primary/15 ring-primary/25" },
    { icon: UserCheck, label: "Active Users", value: stats.active, delta: null, tone: "text-safe bg-safe/15 ring-safe/25" },
    { icon: UserPlus, label: "New Users", value: stats.newUsers, delta: null, tone: "text-accent bg-accent/15 ring-accent/25" },
    { icon: UserMinus, label: "Suspended", value: stats.suspended, delta: null, tone: "text-warn bg-warn/15 ring-warn/25" },
    { icon: Ban, label: "Banned", value: stats.banned, delta: null, tone: "text-danger bg-danger/15 ring-danger/25" },
  ];

  return (
    <div className="mx-auto max-w-[1400px]">
      {/* Header */}
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Users</h1>
          <p className="text-[13px] text-muted-2">Manage and monitor all users on Watchruum.</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-primary to-primary-strong px-3.5 py-2 text-[13px] font-semibold text-white shadow-[0_8px_24px_-10px_rgba(124,58,237,0.9)] hover:brightness-110">
            <Plus className="size-4" /> Add User
          </button>
          <button className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-white/[0.03] px-3.5 py-2 text-[13px] font-semibold hover:bg-white/[0.07]">
            <Download className="size-4" /> Export
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-4 flex flex-wrap gap-1 border-b border-border">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={qs({ tab: t.key, page: 1 })}
            className={
              tab === t.key
                ? "border-b-2 border-primary px-3 py-2 text-[13px] font-semibold text-foreground"
                : "border-b-2 border-transparent px-3 py-2 text-[13px] font-medium text-muted hover:text-foreground"
            }
          >
            {t.label}
          </Link>
        ))}
      </div>

      <div className="flex flex-col gap-6 xl:flex-row">
        <div className="min-w-0 flex-1 space-y-5">
          {/* Stat cards */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {statCards.map((s) => (
              <div key={s.label} className="glass rounded-2xl p-4">
                <span className={`grid size-9 place-items-center rounded-xl ring-1 ${s.tone}`}>
                  <s.icon className="size-4" />
                </span>
                <p className="mt-3 text-2xl font-extrabold">{s.value.toLocaleString()}</p>
                <p className="text-[12px] text-muted-2">{s.label}</p>
                <p className="mt-1 text-[11px] font-medium text-safe">{s.delta != null ? `+${s.delta} this week` : " "}</p>
              </div>
            ))}
          </div>

          {/* Table card */}
          <div className="glass rounded-2xl">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-2 p-4">
              <form action="/admin/users" method="get" className="relative min-w-0 flex-1">
                {tab !== "all" && <input type="hidden" name="tab" value={tab} />}
                {role !== "all" && <input type="hidden" name="role" value={role} />}
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-2" />
                <input
                  name="q"
                  defaultValue={q}
                  placeholder="Search users by name or username…"
                  className="h-10 w-full rounded-xl border border-border bg-white/[0.03] pl-9 pr-3 text-sm placeholder:text-muted-2 focus:border-primary/60 focus:outline-none"
                />
              </form>
              <ToolbarButton icon={SlidersHorizontal} label="Filters" />
              <ToolbarButton icon={Columns3} label="Columns" />
              <ToolbarButton icon={ChevronDown} label="Bulk Actions" trailing />
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] text-left text-[13px]">
                <thead>
                  <tr className="border-y border-border text-[11px] uppercase tracking-wide text-muted-2">
                    <th className="w-10 px-4 py-2.5">
                      <span className="block size-4 rounded border border-border" />
                    </th>
                    <th className="py-2.5 pr-4 font-semibold">User</th>
                    <th className="py-2.5 pr-4 font-semibold">Status</th>
                    <th className="py-2.5 pr-4 font-semibold">Role</th>
                    <th className="py-2.5 pr-4 font-semibold">Joined</th>
                    <th className="py-2.5 pr-4 font-semibold">Last Active</th>
                    <th className="py-2.5 pr-4 font-semibold">Rooms</th>
                    <th className="py-2.5 pr-4 font-semibold">Reports</th>
                    <th className="py-2.5 pr-4 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-10 text-center text-muted-2">
                        No users match this view.
                      </td>
                    </tr>
                  ) : (
                    rows.map((u) => (
                      <tr key={u.id} className="border-b border-border/50 last:border-0 hover:bg-white/[0.02]">
                        <td className="px-4 py-3">
                          <span className="block size-4 rounded border border-border" />
                        </td>
                        <td className="py-3 pr-4">
                          <div className="flex items-center gap-2.5">
                            <Avatar name={u.display_name} src={u.avatar_url} size="sm" />
                            <div className="min-w-0">
                              <p className="flex items-center gap-1.5 font-semibold">
                                <span className="truncate">{u.display_name}</span>
                                {u.is_admin ? (
                                  <span className="rounded bg-primary/20 px-1.5 py-0.5 text-[10px] font-bold text-primary">
                                    Admin
                                  </span>
                                ) : u.is_moderator ? (
                                  <span className="rounded bg-accent/20 px-1.5 py-0.5 text-[10px] font-bold text-accent">
                                    Moderator
                                  </span>
                                ) : null}
                              </p>
                              <p className="truncate text-[12px] text-muted-2">@{u.username ?? "member"}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 pr-4">
                          {(() => {
                            const s = STATUS_BADGE[u.status] ?? STATUS_BADGE.active;
                            return <Badge variant={s.variant}>{s.label}</Badge>;
                          })()}
                        </td>
                        <td className="py-3 pr-4 text-muted">
                          {u.is_admin ? "Admin" : u.is_moderator ? "Moderator" : "User"}
                        </td>
                        <td className="whitespace-nowrap py-3 pr-4 text-muted">{joinedLabel(u.created_at)}</td>
                        <td className="whitespace-nowrap py-3 pr-4">
                          <span className="flex items-center gap-1.5 text-muted">
                            <span className={`size-1.5 rounded-full ${activeDot(u.last_active)}`} />
                            {u.last_active ? timeAgo(u.last_active) : "—"}
                          </span>
                        </td>
                        <td className="py-3 pr-4 font-medium">{compact(u.rooms)}</td>
                        <td className="py-3 pr-4">
                          <span className={u.reports > 0 ? "font-semibold text-danger" : "text-muted"}>{u.reports}</span>
                        </td>
                        <td className="py-3 pr-4">
                          <UserActionsMenu
                            user={{
                              id: u.id,
                              display_name: u.display_name,
                              username: u.username,
                              is_admin: u.is_admin,
                              is_moderator: u.is_moderator,
                              status: u.status,
                            }}
                          />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-4">
              <p className="text-[12px] text-muted-2">
                Showing {start} to {end} of {total.toLocaleString()} users
              </p>
              <div className="flex items-center gap-1">
                <PageLink href={qs({ page: Math.max(1, page - 1) })} disabled={page <= 1} icon={ChevronLeft} />
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map((n) => (
                  <Link
                    key={n}
                    href={qs({ page: n })}
                    className={
                      n === page
                        ? "grid size-8 place-items-center rounded-lg bg-primary text-[12px] font-bold text-white"
                        : "grid size-8 place-items-center rounded-lg text-[12px] font-semibold text-muted hover:bg-white/5"
                    }
                  >
                    {n}
                  </Link>
                ))}
                {totalPages > 5 && <span className="px-1 text-muted-2">…</span>}
                <PageLink href={qs({ page: Math.min(totalPages, page + 1) })} disabled={page >= totalPages} icon={ChevronRight} />
              </div>
            </div>
          </div>
        </div>

        {/* Right rail */}
        <aside className="w-full shrink-0 space-y-4 xl:w-80">
          <div className="glass rounded-2xl p-5">
            <h3 className="mb-4 text-base font-semibold">User Summary</h3>
            <Donut slices={data.breakdown} total={stats.total} />
          </div>

          <div className="glass rounded-2xl p-5">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-base font-semibold">User Growth</h3>
              <span className="text-[11px] text-muted-2">Last 7 days</span>
            </div>
            <AreaChart data={data.growth} />
          </div>

          {/* Filters */}
          <form action="/admin/users" method="get" className="glass rounded-2xl p-5">
            {q && <input type="hidden" name="q" value={q} />}
            {tab !== "all" && <input type="hidden" name="tab" value={tab} />}
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-base font-semibold">Filters</h3>
              <Link href={qs({ role: "all", page: 1 })} className="text-[12px] font-semibold text-primary hover:underline">
                Clear all
              </Link>
            </div>
            <label className="mb-1 block text-[12px] font-medium text-muted">Role</label>
            <select
              name="role"
              defaultValue={role}
              className="mb-4 h-10 w-full rounded-xl border border-border bg-white/[0.03] px-3 text-sm focus:border-primary/60 focus:outline-none"
            >
              <option value="all">All Roles</option>
              <option value="admin">Admin</option>
              <option value="moderator">Moderator</option>
              <option value="user">User</option>
            </select>
            <button className="h-10 w-full rounded-xl bg-gradient-to-r from-primary to-primary-strong text-sm font-semibold text-white hover:brightness-110">
              Apply Filters
            </button>
          </form>

          <div className="glass rounded-2xl p-5">
            <h3 className="mb-3 text-base font-semibold">Quick Actions</h3>
            <div className="grid grid-cols-2 gap-2">
              <span className="flex flex-col items-center gap-1.5 rounded-xl border border-border bg-white/[0.03] px-2 py-3 text-center text-[12px] font-semibold text-muted-2">
                <Upload className="size-4 text-primary" /> Import Users
              </span>
              <Link
                href="/admin/email-templates"
                className="flex flex-col items-center gap-1.5 rounded-xl border border-border bg-white/[0.03] px-2 py-3 text-center text-[12px] font-semibold text-muted transition-colors hover:bg-white/[0.07] hover:text-foreground"
              >
                <Mail className="size-4 text-primary" /> Send Email
              </Link>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function ToolbarButton({
  icon: Icon,
  label,
  trailing,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  trailing?: boolean;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-white/[0.03] px-3 py-2 text-[12px] font-semibold text-muted">
      {!trailing && <Icon className="size-3.5" />}
      {label}
      {trailing && <Icon className="size-3.5" />}
    </span>
  );
}

function PageLink({
  href,
  disabled,
  icon: Icon,
}: {
  href: string;
  disabled: boolean;
  icon: React.ComponentType<{ className?: string }>;
}) {
  if (disabled)
    return (
      <span className="grid size-8 place-items-center rounded-lg text-muted-2 opacity-40">
        <Icon className="size-4" />
      </span>
    );
  return (
    <Link href={href} className="grid size-8 place-items-center rounded-lg text-muted hover:bg-white/5 hover:text-foreground">
      <Icon className="size-4" />
    </Link>
  );
}
