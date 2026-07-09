import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { ArrowLeft, Star, MessageSquare } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { AddNoteForm, IssueWarningForm } from "@/components/admin/user-detail-forms";
import { getAdminUserDetail } from "@/lib/admin";
import { timeAgo } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin · User · Watchruum" };

type StatusVariant = "safe" | "warn" | "danger" | "neutral";

function statusVariant(status: string): StatusVariant {
  switch (status) {
    case "active":
      return "safe";
    case "muted":
    case "limited":
    case "suspended":
      return "warn";
    case "banned":
      return "danger";
    default:
      return "neutral";
  }
}

function reportVariant(status: string): StatusVariant {
  switch (status) {
    case "resolved":
      return "safe";
    case "dismissed":
      return "neutral";
    default:
      return "warn";
  }
}

function cap(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default async function AdminUserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const d = await getAdminUserDetail(id);

  if (!d.isAdmin) redirect("/");
  if (!d.user) notFound();
  const u = d.user;

  const statTiles: { label: string; value: number; href?: string }[] = [
    { label: "Reviews", value: d.stats.reviews },
    { label: "Comments", value: d.stats.comments },
    { label: "Rooms", value: d.stats.rooms },
    { label: "Reports", value: d.stats.reports, href: "#reports" },
    { label: "Warnings", value: d.stats.warnings, href: "#warnings" },
  ];

  const details: { label: string; value: React.ReactNode }[] = [
    { label: "User ID", value: <span className="font-mono text-[12px]">{u.id}</span> },
    { label: "Username", value: u.username ? `@${u.username}` : "—" },
    { label: "Role", value: u.is_admin ? "Admin" : "User" },
    { label: "Status", value: cap(u.status) },
    { label: "Reason", value: u.status_reason ?? "—" },
    { label: "Joined", value: fmtDate(u.created_at) },
  ];

  return (
    <div className="mx-auto max-w-4xl">
      <Link
        href="/admin/users"
        className="mb-4 inline-flex items-center gap-1.5 text-[13px] text-muted-2 transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" /> Back to Users
      </Link>

      {/* Header */}
      <div className="glass rounded-2xl p-5">
        <div className="flex items-start gap-4">
          <Avatar name={u.display_name} src={u.avatar_url} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-extrabold tracking-tight">{u.display_name}</h1>
              <Badge variant={statusVariant(u.status)}>{cap(u.status)}</Badge>
            </div>
            <p className="text-[13px] text-muted">@{u.username ?? "member"}</p>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-muted-2">
              <span>{u.is_admin ? "Admin" : "User"}</span>
              <span className="text-muted-2/50">·</span>
              <span>Joined {fmtDate(u.created_at)}</span>
            </div>
            {u.bio && <p className="mt-3 text-[13px] text-muted">{u.bio}</p>}
            {u.favorite_genres.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {u.favorite_genres.map((g) => (
                  <span
                    key={g}
                    className="rounded-full border border-border bg-white/5 px-2 py-0.5 text-[11px]"
                  >
                    {g}
                  </span>
                ))}
              </div>
            )}
            {u.status_reason && (
              <div className="mt-3 rounded-xl border border-border bg-white/[0.03] p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-2">Status reason</p>
                <p className="mt-1 text-[13px] text-muted">{u.status_reason}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stat tiles */}
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-5">
        {statTiles.map((t) =>
          t.href && t.value > 0 ? (
            <Link key={t.label} href={t.href} className="glass glass-hover rounded-2xl p-4 transition-colors">
              <p className="text-2xl font-extrabold">{t.value}</p>
              <p className="text-[12px] text-primary">{t.label}</p>
            </Link>
          ) : (
            <div key={t.label} className="glass rounded-2xl p-4">
              <p className="text-2xl font-extrabold">{t.value}</p>
              <p className="text-[12px] text-muted-2">{t.label}</p>
            </div>
          ),
        )}
      </div>

      <div className="mt-5 space-y-5">
        {/* Admin Details */}
        <section id="details">
          <h2 className="mb-3 text-base font-semibold">Admin Details</h2>
          <div className="glass rounded-2xl p-5">
            <dl className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
              {details.map((row) => (
                <div key={row.label} className="flex items-start justify-between gap-4">
                  <dt className="text-[13px] text-muted-2">{row.label}</dt>
                  <dd className="text-right text-[13px] text-foreground">{row.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* Activity */}
        <section id="activity">
          <h2 className="mb-3 text-base font-semibold">Activity</h2>
          <div className="glass rounded-2xl p-5">
            {d.activity.length === 0 ? (
              <p className="text-[13px] text-muted-2">No activity yet.</p>
            ) : (
              <ul className="space-y-3.5">
                {d.activity.map((a) => {
                  const Icon = a.kind === "review" ? Star : MessageSquare;
                  return (
                    <li key={a.id} className="flex items-start gap-3">
                      <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg bg-white/5 text-muted">
                        <Icon className="size-3.5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-medium leading-tight">{a.label}</p>
                        {a.body && <p className="line-clamp-2 text-[13px] text-muted">{a.body}</p>}
                      </div>
                      <span className="shrink-0 text-[11px] text-muted-2">{timeAgo(a.created_at)}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>

        {/* Reports */}
        <section id="reports">
          <h2 className="mb-3 text-base font-semibold">Reports</h2>
          <div className="glass rounded-2xl p-5">
            {d.reports.length === 0 ? (
              <p className="text-[13px] text-muted-2">No reports against this user.</p>
            ) : (
              <ul className="space-y-1">
                {d.reports.map((r) => (
                  <li key={r.id} className="border-b border-border/60 last:border-0">
                    <Link
                      href="/admin/reports"
                      className="-mx-2 flex items-start justify-between gap-3 rounded-lg px-2 py-3 transition-colors hover:bg-white/5"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-medium">{r.content}</p>
                        <p className="text-[12px] text-muted">{r.reason}</p>
                        <p className="mt-0.5 text-[11px] font-semibold text-primary">Review report →</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <Badge variant={reportVariant(r.status)}>{cap(r.status)}</Badge>
                        <span className="text-[11px] text-muted-2">{timeAgo(r.created_at)}</span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* Admin Notes */}
        <section id="notes">
          <h2 className="mb-3 text-base font-semibold">Admin Notes</h2>
          <div className="glass rounded-2xl p-5">
            <AddNoteForm userId={id} />
            {d.notes.length === 0 ? (
              <p className="mt-4 text-[13px] text-muted-2">No notes yet.</p>
            ) : (
              <ul className="mt-4 space-y-3">
                {d.notes.map((n) => (
                  <li key={n.id} className="border-b border-border/60 pb-3 last:border-0 last:pb-0">
                    <p className="text-[13px] text-foreground">{n.body}</p>
                    <p className="mt-1 text-[12px] text-muted-2">
                      — {n.author_name} · {timeAgo(n.created_at)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* Warnings */}
        <section id="warnings">
          <h2 className="mb-3 text-base font-semibold">Warnings</h2>
          <div className="glass rounded-2xl p-5">
            <IssueWarningForm userId={id} />
            {d.warnings.length === 0 ? (
              <p className="mt-4 text-[13px] text-muted-2">No warnings issued.</p>
            ) : (
              <ul className="mt-4 space-y-3">
                {d.warnings.map((w) => (
                  <li key={w.id} className="border-b border-border/60 pb-3 last:border-0 last:pb-0">
                    <p className="text-[13px] text-foreground">{w.reason}</p>
                    <p className="mt-1 text-[12px] text-muted-2">
                      by {w.issued_by_name} · {timeAgo(w.created_at)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
