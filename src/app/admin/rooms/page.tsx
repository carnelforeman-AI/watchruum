import Link from "next/link";
import {
  Clapperboard,
  Radio,
  Flame,
  Flag,
  Lock,
  Archive,
  Search,
  SlidersHorizontal,
  Columns3,
  ChevronDown,
  Plus,
  Download,
  Settings2,
  Film,
  Tv,
  ListVideo,
  Star,
  Pin,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Donut, Sparkline } from "@/components/admin/charts";
import { RoomActionsMenu } from "@/components/admin/room-actions-menu";
import { getAdminRooms, type AdminRoomRow, type RoomStatus } from "@/lib/admin";
import { timeAgo, compact, posterGradient } from "@/lib/utils";

export const metadata = { title: "Admin · Watch Rooms · Watchruum" };
export const dynamic = "force-dynamic";

const TABS = [
  { key: "all", label: "All Rooms" },
  { key: "active", label: "Active" },
  { key: "trending", label: "Trending" },
  { key: "new", label: "New" },
  { key: "reported", label: "Reported" },
  { key: "locked", label: "Locked" },
  { key: "archived", label: "Archived" },
];

const STATUS_BADGE: Record<RoomStatus, { variant: "safe" | "warn" | "danger" | "neutral" | "hot" | "default"; label: string }> = {
  active: { variant: "safe", label: "Active" },
  trending: { variant: "hot", label: "Trending" },
  new: { variant: "default", label: "New" },
  reported: { variant: "danger", label: "Reported" },
  locked: { variant: "warn", label: "Locked" },
  archived: { variant: "neutral", label: "Archived" },
  removed: { variant: "danger", label: "Removed" },
};

const CAT_TONE: Record<string, string> = {
  "Movie Discussion": "text-accent-2 bg-accent-2/15 ring-accent-2/25",
  "Show Discussion": "text-accent bg-accent/15 ring-accent/25",
  "Episode Discussion": "text-primary bg-primary/15 ring-primary/25",
};

function viewHref(r: AdminRoomRow) {
  if (r.room_type === "episode_room") {
    const ep = r.scope_label.match(/E(\d+)/)?.[1] ?? "1";
    return `/title/${r.media_id}/season/1/episode/${ep}`;
  }
  return `/title/${r.media_id}`;
}

type SP = Record<string, string | string[] | undefined>;
const val = (sp: SP, k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : undefined);

export default async function AdminRoomsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const q = val(sp, "q") ?? "";
  const tab = val(sp, "tab") ?? "all";
  const type = val(sp, "type") ?? "all";
  const page = Math.max(1, Number(val(sp, "page") ?? "1") || 1);

  const data = await getAdminRooms({ q, tab, type, page, perPage: 10 });
  const { rows, total, perPage, stats } = data;

  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const start = total === 0 ? 0 : (page - 1) * perPage + 1;
  const end = Math.min(total, page * perPage);

  const qs = (over: Record<string, string | number>) => {
    const p = new URLSearchParams();
    const merged = { q, tab, type, page, ...over };
    if (merged.q) p.set("q", String(merged.q));
    if (merged.tab && merged.tab !== "all") p.set("tab", String(merged.tab));
    if (merged.type && merged.type !== "all") p.set("type", String(merged.type));
    if (merged.page && Number(merged.page) > 1) p.set("page", String(merged.page));
    const s = p.toString();
    return s ? `/admin/rooms?${s}` : "/admin/rooms";
  };

  const statCards = [
    { icon: Clapperboard, label: "Total Rooms", value: stats.total, tone: "text-primary bg-primary/15 ring-primary/25" },
    { icon: Radio, label: "Active", value: stats.active, tone: "text-safe bg-safe/15 ring-safe/25" },
    { icon: Flame, label: "Trending", value: stats.trending, tone: "text-accent bg-accent/15 ring-accent/25" },
    { icon: Flag, label: "Reported", value: stats.reported, tone: "text-danger bg-danger/15 ring-danger/25" },
    { icon: Lock, label: "Locked", value: stats.locked, tone: "text-warn bg-warn/15 ring-warn/25" },
    { icon: Archive, label: "Archived", value: stats.archived, tone: "text-muted bg-white/[0.05] ring-border" },
  ];

  const maxTopRooms = Math.max(1, ...data.topShows.map((s) => s.rooms));

  return (
    <div className="mx-auto max-w-[1400px]">
      {/* Header */}
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Watch Rooms</h1>
          <p className="text-[13px] text-muted-2">
            Every movie room, show room, and episode room across Watchruum.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-primary to-primary-strong px-3.5 py-2 text-[13px] font-semibold text-white shadow-[0_8px_24px_-10px_rgba(124,58,237,0.9)] hover:brightness-110">
            <Plus className="size-4" /> Create Room
          </button>
          <button className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-white/[0.03] px-3.5 py-2 text-[13px] font-semibold hover:bg-white/[0.07]">
            <Download className="size-4" /> Export
          </button>
          <button className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-white/[0.03] px-3.5 py-2 text-[13px] font-semibold hover:bg-white/[0.07]">
            <Settings2 className="size-4" /> Room Settings
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
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {statCards.map((s) => (
              <div key={s.label} className="glass rounded-2xl p-4">
                <span className={`grid size-9 place-items-center rounded-xl ring-1 ${s.tone}`}>
                  <s.icon className="size-4" />
                </span>
                <p className="mt-3 text-2xl font-extrabold">{s.value.toLocaleString()}</p>
                <p className="text-[12px] text-muted-2">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Table card */}
          <div className="glass rounded-2xl">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-2 p-4">
              <form action="/admin/rooms" method="get" className="relative min-w-0 flex-1">
                {tab !== "all" && <input type="hidden" name="tab" value={tab} />}
                {type !== "all" && <input type="hidden" name="type" value={type} />}
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-2" />
                <input
                  name="q"
                  defaultValue={q}
                  placeholder="Search rooms by title or creator…"
                  className="h-10 w-full rounded-xl border border-border bg-white/[0.03] pl-9 pr-3 text-sm placeholder:text-muted-2 focus:border-primary/60 focus:outline-none"
                />
              </form>
              <ToolbarButton icon={SlidersHorizontal} label="Filters" />
              <ToolbarButton icon={Columns3} label="Columns" />
              <ToolbarButton icon={ChevronDown} label="Bulk Actions" trailing />
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-[13px]">
                <thead>
                  <tr className="border-y border-border text-[11px] uppercase tracking-wide text-muted-2">
                    <th className="w-10 px-4 py-2.5">
                      <span className="block size-4 rounded border border-border" />
                    </th>
                    <th className="py-2.5 pr-4 font-semibold">Room</th>
                    <th className="py-2.5 pr-4 font-semibold">Scope</th>
                    <th className="py-2.5 pr-4 font-semibold">Category</th>
                    <th className="py-2.5 pr-4 font-semibold">Members</th>
                    <th className="py-2.5 pr-4 font-semibold">Activity</th>
                    <th className="py-2.5 pr-4 font-semibold">Status</th>
                    <th className="py-2.5 pr-4 font-semibold">Reports</th>
                    <th className="py-2.5 pr-4 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-10 text-center text-muted-2">
                        No rooms match this view.
                      </td>
                    </tr>
                  ) : (
                    rows.map((r) => {
                      const badge = STATUS_BADGE[r.status];
                      const ScopeIcon = r.room_type === "movie_room" ? Film : r.room_type === "title_room" ? Tv : ListVideo;
                      return (
                        <tr key={r.id} className="border-b border-border/50 last:border-0 hover:bg-white/[0.02]">
                          <td className="px-4 py-3">
                            <span className="block size-4 rounded border border-border" />
                          </td>
                          <td className="py-3 pr-4">
                            <div className="flex items-center gap-2.5">
                              <span
                                className="relative grid size-10 shrink-0 place-items-center overflow-hidden rounded-lg ring-1 ring-border"
                                style={{ background: posterGradient(r.title) }}
                              >
                                {r.poster_url ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img src={r.poster_url} alt="" className="size-full object-cover" />
                                ) : (
                                  <Clapperboard className="size-4 text-white/70" />
                                )}
                              </span>
                              <div className="min-w-0">
                                <p className="flex items-center gap-1.5 font-semibold">
                                  <span className="truncate">{r.title}</span>
                                  {r.featured && <Star className="size-3.5 shrink-0 fill-accent text-accent" />}
                                  {r.pinned && <Pin className="size-3.5 shrink-0 text-primary" />}
                                </p>
                                <p className="truncate text-[12px] text-muted-2">by @{r.creator}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 pr-4">
                            <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-border bg-white/[0.03] px-2 py-1 text-[12px] font-medium text-muted">
                              <ScopeIcon className="size-3.5" />
                              {r.scope_label}
                            </span>
                          </td>
                          <td className="py-3 pr-4">
                            <span
                              className={`inline-block whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${
                                CAT_TONE[r.category] ?? "text-muted bg-white/[0.05] ring-border"
                              }`}
                            >
                              {r.category}
                            </span>
                          </td>
                          <td className="py-3 pr-4 font-medium">{compact(r.members)}</td>
                          <td className="py-3 pr-4">
                            <div className="flex items-center gap-2.5">
                              <Sparkline data={r.activity} tone={r.is_hot ? "var(--color-accent)" : "var(--color-primary)"} />
                              <span className="whitespace-nowrap text-[11px] text-muted-2">{timeAgo(r.last_active)}</span>
                            </div>
                          </td>
                          <td className="py-3 pr-4">
                            <Badge variant={badge.variant}>{badge.label}</Badge>
                          </td>
                          <td className="py-3 pr-4">
                            <span className={r.reports > 0 ? "font-semibold text-danger" : "text-muted"}>{r.reports}</span>
                          </td>
                          <td className="py-3 pr-4">
                            <RoomActionsMenu
                              room={{
                                roomKey: r.id,
                                title: r.title,
                                scope_label: r.scope_label,
                                viewHref: viewHref(r),
                                reported: r.reports > 0 || r.status === "reported",
                                featured: r.featured,
                                pinned: r.pinned,
                                locked: r.locked,
                                archived: r.archived,
                                hidden: r.hidden,
                              }}
                            />
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-4">
              <p className="text-[12px] text-muted-2">
                Showing {start} to {end} of {total.toLocaleString()} rooms
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
            <h3 className="mb-4 text-base font-semibold">Room Overview</h3>
            <Donut slices={data.breakdown} total={stats.total} />
          </div>

          {/* Top shows by rooms */}
          <div className="glass rounded-2xl p-5">
            <h3 className="mb-4 text-base font-semibold">Top Shows by Rooms</h3>
            <ul className="space-y-3">
              {data.topShows.map((s) => (
                <li key={s.title}>
                  <div className="mb-1 flex items-center justify-between gap-2 text-[13px]">
                    <span className="min-w-0 truncate text-muted">{s.title}</span>
                    <span className="shrink-0 font-semibold">{s.rooms}</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-primary to-accent"
                      style={{ width: `${Math.round((s.rooms / maxTopRooms) * 100)}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Recent room activity */}
          <div className="glass rounded-2xl p-5">
            <h3 className="mb-3 text-base font-semibold">Recent Room Activity</h3>
            <ul className="space-y-3">
              {data.recentActivity.map((a) => (
                <li key={a.id} className="flex items-start gap-2.5">
                  <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg bg-primary/15 text-primary ring-1 ring-primary/25">
                    <Clapperboard className="size-3.5" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[13px] leading-snug">
                      <span className="font-semibold">@{a.actor}</span>{" "}
                      <span className="text-muted-2">{a.verb}</span>
                    </p>
                    <p className="truncate text-[12px] text-muted-2">
                      {a.target} · {timeAgo(a.created_at)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Filters */}
          <form action="/admin/rooms" method="get" className="glass rounded-2xl p-5">
            {q && <input type="hidden" name="q" value={q} />}
            {tab !== "all" && <input type="hidden" name="tab" value={tab} />}
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-base font-semibold">Filters</h3>
              <Link href={qs({ type: "all", page: 1 })} className="text-[12px] font-semibold text-primary hover:underline">
                Clear all
              </Link>
            </div>
            <label className="mb-1 block text-[12px] font-medium text-muted">Room type</label>
            <select
              name="type"
              defaultValue={type}
              className="mb-4 h-10 w-full rounded-xl border border-border bg-white/[0.03] px-3 text-sm focus:border-primary/60 focus:outline-none"
            >
              <option value="all">All Types</option>
              <option value="movie">Movie Rooms</option>
              <option value="show">Show Rooms</option>
              <option value="episode">Episode Rooms</option>
            </select>
            <button className="h-10 w-full rounded-xl bg-gradient-to-r from-primary to-primary-strong text-sm font-semibold text-white hover:brightness-110">
              Apply Filters
            </button>
          </form>
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
