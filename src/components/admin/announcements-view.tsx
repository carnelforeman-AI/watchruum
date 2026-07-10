"use client";

import { useMemo, useState } from "react";
import {
  Plus,
  Search,
  ChevronDown,
  Filter,
  Eye,
  Pencil,
  X,
  ArrowRight,
  Megaphone,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { SendMenu } from "@/components/admin/send-menu";
import { cn } from "@/lib/utils";

export type Priority = "High" | "Medium" | "Low";
export type AnnStatus = "Published" | "Draft" | "Scheduled";

export interface Announcement {
  id: string;
  title: string;
  summary: string;
  priority: Priority;
  audience: string;
  publishedDate: string;
  publishedTime: string;
  views: number;
  status: AnnStatus;
  body: string;
}

const PRIORITY_CLASS: Record<Priority, string> = {
  High: "bg-danger/15 text-danger ring-danger/30",
  Medium: "bg-[#f59e0b]/15 text-[#f59e0b] ring-[#f59e0b]/30",
  Low: "bg-white/10 text-muted ring-white/15",
};

const STATUS_CLASS: Record<AnnStatus, string> = {
  Published: "bg-safe/15 text-safe ring-safe/30",
  Draft: "bg-white/10 text-muted ring-white/15",
  Scheduled: "bg-[#3b82f6]/15 text-[#3b82f6] ring-[#3b82f6]/30",
};

const PRIORITIES = ["All Priorities", "High", "Medium", "Low"];
const AUDIENCES = ["All Users", "Active Users", "Subscribed Users", "Admins"];

export function AnnouncementsView({ announcements }: { announcements: Announcement[] }) {
  const [query, setQuery] = useState("");
  const [priority, setPriority] = useState("All Priorities");
  const [showFilters, setShowFilters] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"all" | AnnStatus>("all");
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return announcements.filter((a) => {
      if (q && !`${a.title} ${a.summary}`.toLowerCase().includes(q)) return false;
      if (priority !== "All Priorities" && a.priority !== priority) return false;
      if (statusFilter !== "all" && a.status !== statusFilter) return false;
      return true;
    });
  }, [announcements, query, priority, statusFilter]);

  const preview = announcements.find((a) => a.id === previewId) ?? null;

  return (
    <div className="mx-auto max-w-[1400px]">
      {/* header */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Announcements</h1>
          <p className="text-[13px] text-muted-2">Create and manage announcements for your community.</p>
        </div>
        <button
          onClick={() => setShowNew(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary to-primary-strong px-4 py-2.5 text-[14px] font-bold text-white shadow-[0_8px_24px_-10px_rgba(124,58,237,0.9)] transition hover:brightness-110"
        >
          <Plus className="size-4" /> New Announcement
        </button>
      </div>

      {/* controls */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-2" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search announcements..."
            className="w-full rounded-xl border border-border bg-white/[0.03] py-2.5 pl-10 pr-4 text-[14px] outline-none transition focus:border-primary/50"
          />
        </div>

        <div className="relative">
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            className="appearance-none rounded-xl border border-border bg-white/[0.03] py-2.5 pl-4 pr-9 text-[13px] font-semibold outline-none transition focus:border-primary/50"
          >
            {PRIORITIES.map((p) => (
              <option key={p} value={p} className="bg-bg-elevated">
                {p}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-2" />
        </div>

        <button
          onClick={() => setShowFilters((v) => !v)}
          className={cn(
            "ml-auto inline-flex items-center gap-2 rounded-xl border px-3.5 py-2.5 text-[13px] font-semibold transition",
            showFilters || statusFilter !== "all"
              ? "border-primary/50 bg-primary/10 text-foreground"
              : "border-border bg-white/[0.03] text-muted hover:text-foreground",
          )}
        >
          <Filter className="size-4" /> Filters
        </button>
      </div>

      {showFilters && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-[12px] font-semibold text-muted-2">Status:</span>
          {(["all", "Published", "Draft", "Scheduled"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={cn(
                "rounded-full px-3 py-1 text-[12px] font-semibold transition",
                statusFilter === s ? "bg-primary text-white" : "border border-border bg-white/[0.03] text-muted hover:text-foreground",
              )}
            >
              {s === "all" ? "All" : s}
            </button>
          ))}
        </div>
      )}

      {/* table */}
      <div className="glass mt-4 rounded-2xl border border-border-soft">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left">
            <thead>
              <tr className="border-b border-border text-[11px] uppercase tracking-wide text-muted-2">
                <th className="px-5 py-3.5 font-semibold">Announcement</th>
                <th className="px-3 py-3.5 font-semibold">Priority</th>
                <th className="px-3 py-3.5 font-semibold">Audience</th>
                <th className="px-3 py-3.5 font-semibold">Published</th>
                <th className="px-3 py-3.5 font-semibold">Views</th>
                <th className="px-3 py-3.5 font-semibold">Status</th>
                <th className="px-3 py-3.5 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visible.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-sm text-muted-2">
                    No announcements match your search.
                  </td>
                </tr>
              ) : (
                visible.map((a) => (
                  <tr key={a.id} className="border-b border-border/60 last:border-0 hover:bg-white/[0.02]">
                    <td className="max-w-[340px] px-5 py-3.5">
                      <p className="truncate text-[14px] font-bold">{a.title}</p>
                      <p className="truncate text-[12px] text-muted-2">{a.summary}</p>
                    </td>
                    <td className="px-3 py-3.5">
                      <span className={cn("inline-flex rounded-md px-2 py-0.5 text-[11px] font-semibold ring-1", PRIORITY_CLASS[a.priority])}>
                        {a.priority}
                      </span>
                    </td>
                    <td className="px-3 py-3.5 text-[13px] text-muted">{a.audience}</td>
                    <td className="px-3 py-3.5">
                      <p className="text-[13px] font-medium">{a.publishedDate}</p>
                      <p className="text-[12px] text-muted-2">{a.publishedTime}</p>
                    </td>
                    <td className="px-3 py-3.5 text-[13px] font-semibold">{a.views.toLocaleString("en-US")}</td>
                    <td className="px-3 py-3.5">
                      <span className={cn("inline-flex rounded-md px-2 py-1 text-[11px] font-semibold ring-1", STATUS_CLASS[a.status])}>
                        {a.status}
                      </span>
                    </td>
                    <td className="px-3 py-3.5">
                      <div className="flex items-center justify-end gap-1">
                        <IconBtn label="Preview" onClick={() => setPreviewId(a.id)}>
                          <Eye className="size-4" />
                        </IconBtn>
                        <IconBtn label="Edit" onClick={() => setShowNew(true)}>
                          <Pencil className="size-4" />
                        </IconBtn>
                        <SendMenu subject={a.title} body={a.body} />
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="border-t border-border px-5 py-4 text-center">
          <button className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-primary hover:underline">
            View All Announcements <ArrowRight className="size-4" />
          </button>
        </div>
      </div>

      {/* preview modal */}
      {preview && (
        <div className="fixed inset-0 z-[70] grid place-items-center bg-black/60 p-4 backdrop-blur-sm" onClick={() => setPreviewId(null)}>
          <div className="glass w-full max-w-lg rounded-2xl p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="grid size-9 place-items-center rounded-xl bg-primary/15 text-primary">
                  <Megaphone className="size-[18px]" />
                </span>
                <div>
                  <h3 className="text-base font-bold leading-tight">{preview.title}</h3>
                  <div className="mt-1 flex items-center gap-1.5">
                    <span className={cn("inline-flex rounded px-1.5 py-0.5 text-[10px] font-semibold ring-1", PRIORITY_CLASS[preview.priority])}>
                      {preview.priority}
                    </span>
                    <span className={cn("inline-flex rounded px-1.5 py-0.5 text-[10px] font-semibold ring-1", STATUS_CLASS[preview.status])}>
                      {preview.status}
                    </span>
                    <span className="text-[11px] text-muted-2">· {preview.audience}</span>
                  </div>
                </div>
              </div>
              <button onClick={() => setPreviewId(null)} aria-label="Close" className="text-muted-2 hover:text-foreground">
                <X className="size-5" />
              </button>
            </div>

            <p className="mt-3 text-[12px] text-muted-2">
              Published {preview.publishedDate} · {preview.publishedTime} · {preview.views.toLocaleString("en-US")} views
            </p>
            <div className="mt-3 whitespace-pre-line rounded-xl border border-border bg-white/[0.02] px-4 py-4 text-[13px] leading-relaxed text-muted">
              {preview.body}
            </div>
          </div>
        </div>
      )}

      {showNew && <NewAnnouncementModal onClose={() => setShowNew(false)} />}
    </div>
  );
}

function IconBtn({ children, label, onClick }: { children: React.ReactNode; label: string; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className="grid size-8 place-items-center rounded-lg border border-border bg-white/[0.02] text-muted-2 transition hover:bg-white/5 hover:text-foreground"
    >
      {children}
    </button>
  );
}

function NewAnnouncementModal({ onClose }: { onClose: () => void }) {
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [priority, setPriority] = useState<Priority>("Medium");
  const [audience, setAudience] = useState(AUDIENCES[0]);
  const [body, setBody] = useState("");
  const [done, setDone] = useState(false);

  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-black/60 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="glass w-full max-w-lg rounded-2xl p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="grid size-9 place-items-center rounded-xl bg-primary/15 text-primary">
              <Megaphone className="size-[18px]" />
            </span>
            <h3 className="text-base font-bold">New Announcement</h3>
          </div>
          <button onClick={onClose} aria-label="Close" className="text-muted-2 hover:text-foreground">
            <X className="size-5" />
          </button>
        </div>

        {done ? (
          <div className="py-8 text-center">
            <CheckCircle2 className="mx-auto size-10 text-safe" />
            <p className="mt-3 font-semibold">Announcement drafted</p>
            <p className="mx-auto mt-1 max-w-sm text-sm text-muted-2">
              This is a preview — announcements aren&apos;t persisted yet. Your{" "}
              <span className="font-semibold text-foreground">{priority}</span>-priority post for{" "}
              <span className="font-semibold text-foreground">{audience}</span> is ready to publish.
            </p>
            <div className="mt-5 flex justify-center">
              <Button size="sm" onClick={onClose}>
                Done
              </Button>
            </div>
          </div>
        ) : (
          <>
            <label className="mt-4 block text-[12px] font-semibold text-muted">Title</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} autoFocus placeholder="e.g. New Watchroom Features" className="mt-1.5" />

            <label className="mt-3 block text-[12px] font-semibold text-muted">Summary</label>
            <Input value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="One-line summary shown in the list" className="mt-1.5" />

            <div className="mt-3 grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[12px] font-semibold text-muted">Priority</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as Priority)}
                  className="mt-1.5 w-full rounded-xl border border-border bg-white/5 px-3 py-2.5 text-sm outline-none transition focus:border-primary/60"
                >
                  {(["High", "Medium", "Low"] as Priority[]).map((p) => (
                    <option key={p} value={p} className="bg-bg-elevated">
                      {p}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-muted">Audience</label>
                <select
                  value={audience}
                  onChange={(e) => setAudience(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-border bg-white/5 px-3 py-2.5 text-sm outline-none transition focus:border-primary/60"
                >
                  {AUDIENCES.map((a) => (
                    <option key={a} value={a} className="bg-bg-elevated">
                      {a}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <label className="mt-3 block text-[12px] font-semibold text-muted">Body</label>
            <Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Write the announcement…" className="mt-1.5 min-h-28" />

            <div className="mt-5 flex justify-end gap-2">
              <Button variant="secondary" size="sm" onClick={onClose}>
                Cancel
              </Button>
              <Button size="sm" onClick={() => setDone(true)} disabled={!title.trim() || !summary.trim()}>
                Publish
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
