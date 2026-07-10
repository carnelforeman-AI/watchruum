"use client";

import { useMemo, useState } from "react";
import {
  Plus,
  Search,
  ChevronDown,
  Play,
  Filter,
  Eye,
  Pencil,
  X,
  ArrowRight,
  Mail,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { SendMenu } from "@/components/admin/send-menu";
import { cn } from "@/lib/utils";

export interface EmailTemplate {
  id: string;
  name: string;
  category: string;
  subject: string;
  updated: string;
  by: string;
  usage: number;
  active: boolean;
  body: string;
}

const CAT_COLORS: Record<string, string> = {
  "User Onboarding": "bg-primary/15 text-primary ring-primary/30",
  Account: "bg-[#3b82f6]/15 text-[#3b82f6] ring-[#3b82f6]/30",
  Engagement: "bg-safe/15 text-safe ring-safe/30",
  Digest: "bg-[#f59e0b]/15 text-[#f59e0b] ring-[#f59e0b]/30",
  System: "bg-white/10 text-muted ring-white/15",
};

function catClass(cat: string) {
  return CAT_COLORS[cat] ?? "bg-white/10 text-muted ring-white/15";
}

export function EmailTemplatesView({ templates }: { templates: EmailTemplate[] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All Categories");
  const [showFilters, setShowFilters] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [toggles, setToggles] = useState<Record<string, boolean>>(
    () => Object.fromEntries(templates.map((t) => [t.id, t.active])),
  );
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);

  const categories = useMemo(
    () => ["All Categories", ...Array.from(new Set(templates.map((t) => t.category)))],
    [templates],
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return templates.filter((t) => {
      if (q && !(`${t.name} ${t.subject}`.toLowerCase().includes(q))) return false;
      if (category !== "All Categories" && t.category !== category) return false;
      if (statusFilter === "active" && !toggles[t.id]) return false;
      if (statusFilter === "inactive" && toggles[t.id]) return false;
      return true;
    });
  }, [templates, query, category, statusFilter, toggles]);

  const preview = templates.find((t) => t.id === previewId) ?? null;

  return (
    <div className="mx-auto max-w-[1400px]">
      {/* header */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Email Templates</h1>
          <p className="text-[13px] text-muted-2">Create and manage email templates for your communications.</p>
        </div>
        <button
          onClick={() => setShowNew(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary to-primary-strong px-4 py-2.5 text-[14px] font-bold text-white shadow-[0_8px_24px_-10px_rgba(124,58,237,0.9)] transition hover:brightness-110"
        >
          <Plus className="size-4" /> New Template
        </button>
      </div>

      {/* controls */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-2" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search templates..."
            className="w-full rounded-xl border border-border bg-white/[0.03] py-2.5 pl-10 pr-4 text-[14px] outline-none transition focus:border-primary/50"
          />
        </div>

        <div className="relative">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="appearance-none rounded-xl border border-border bg-white/[0.03] py-2.5 pl-4 pr-9 text-[13px] font-semibold outline-none transition focus:border-primary/50"
          >
            {categories.map((c) => (
              <option key={c} value={c} className="bg-bg-elevated">
                {c}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-2" />
        </div>

        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => setPreviewId(visible[0]?.id ?? templates[0]?.id ?? null)}
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-white/[0.03] px-3.5 py-2.5 text-[13px] font-semibold text-muted transition hover:text-foreground"
          >
            <Play className="size-4" /> Preview
          </button>
          <button
            onClick={() => setShowFilters((v) => !v)}
            className={cn(
              "inline-flex items-center gap-2 rounded-xl border px-3.5 py-2.5 text-[13px] font-semibold transition",
              showFilters || statusFilter !== "all"
                ? "border-primary/50 bg-primary/10 text-foreground"
                : "border-border bg-white/[0.03] text-muted hover:text-foreground",
            )}
          >
            <Filter className="size-4" /> Filters
          </button>
        </div>
      </div>

      {showFilters && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-[12px] font-semibold text-muted-2">Status:</span>
          {(["all", "active", "inactive"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={cn(
                "rounded-full px-3 py-1 text-[12px] font-semibold capitalize transition",
                statusFilter === s ? "bg-primary text-white" : "border border-border bg-white/[0.03] text-muted hover:text-foreground",
              )}
            >
              {s}
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
                <th className="px-5 py-3.5 font-semibold">Template Name</th>
                <th className="px-3 py-3.5 font-semibold">Category</th>
                <th className="px-3 py-3.5 font-semibold">Subject</th>
                <th className="px-3 py-3.5 font-semibold">Last Updated</th>
                <th className="px-3 py-3.5 font-semibold">Usage</th>
                <th className="px-3 py-3.5 font-semibold">Status</th>
                <th className="px-3 py-3.5 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visible.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-sm text-muted-2">
                    No templates match your search.
                  </td>
                </tr>
              ) : (
                visible.map((t) => (
                  <tr key={t.id} className="border-b border-border/60 last:border-0 hover:bg-white/[0.02]">
                    <td className="px-5 py-3.5">
                      <p className="text-[14px] font-bold">{t.name}</p>
                    </td>
                    <td className="px-3 py-3.5">
                      <span className={cn("inline-flex rounded-md px-2 py-0.5 text-[11px] font-semibold ring-1", catClass(t.category))}>
                        {t.category}
                      </span>
                    </td>
                    <td className="max-w-[280px] px-3 py-3.5">
                      <p className="truncate text-[13px] text-muted">{t.subject}</p>
                    </td>
                    <td className="px-3 py-3.5">
                      <p className="text-[13px] font-medium">{t.updated}</p>
                      <p className="text-[12px] text-muted-2">by {t.by}</p>
                    </td>
                    <td className="px-3 py-3.5 text-[13px] font-semibold">{t.usage.toLocaleString("en-US")}</td>
                    <td className="px-3 py-3.5">
                      <Toggle on={!!toggles[t.id]} onToggle={() => setToggles((s) => ({ ...s, [t.id]: !s[t.id] }))} />
                    </td>
                    <td className="px-3 py-3.5">
                      <div className="flex items-center justify-end gap-1">
                        <IconBtn label="Preview" onClick={() => setPreviewId(t.id)}>
                          <Eye className="size-4" />
                        </IconBtn>
                        <IconBtn label="Edit" onClick={() => setShowNew(true)}>
                          <Pencil className="size-4" />
                        </IconBtn>
                        <SendMenu subject={t.subject} body={t.body} />
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
            View All Email Templates <ArrowRight className="size-4" />
          </button>
        </div>
      </div>

      {/* preview modal */}
      {preview && (
        <div className="fixed inset-0 z-[70] grid place-items-center bg-black/60 p-4 backdrop-blur-sm" onClick={() => setPreviewId(null)}>
          <div className="glass w-full max-w-lg rounded-2xl p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="grid size-9 place-items-center rounded-xl bg-primary/15 text-primary">
                  <Mail className="size-[18px]" />
                </span>
                <div>
                  <h3 className="text-base font-bold leading-tight">{preview.name}</h3>
                  <span className={cn("mt-0.5 inline-flex rounded px-1.5 py-0.5 text-[10px] font-semibold ring-1", catClass(preview.category))}>
                    {preview.category}
                  </span>
                </div>
              </div>
              <button onClick={() => setPreviewId(null)} aria-label="Close" className="text-muted-2 hover:text-foreground">
                <X className="size-5" />
              </button>
            </div>

            <div className="mt-4 overflow-hidden rounded-xl border border-border">
              <div className="border-b border-border bg-white/[0.03] px-4 py-2.5">
                <p className="text-[11px] uppercase tracking-wide text-muted-2">Subject</p>
                <p className="text-[14px] font-semibold">{preview.subject}</p>
              </div>
              <div className="whitespace-pre-line bg-white/[0.015] px-4 py-4 text-[13px] leading-relaxed text-muted">
                {preview.body}
              </div>
            </div>
            <p className="mt-3 text-[12px] text-muted-2">
              Tokens like <code className="rounded bg-white/10 px-1">{"{show_title}"}</code> are filled in per recipient
              when the email is sent.
            </p>
          </div>
        </div>
      )}

      {/* new template modal */}
      {showNew && <NewTemplateModal categories={categories.filter((c) => c !== "All Categories")} onClose={() => setShowNew(false)} />}
    </div>
  );
}

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      role="switch"
      aria-checked={on}
      className={cn("relative h-6 w-11 shrink-0 rounded-full transition-colors", on ? "bg-primary" : "bg-white/15")}
    >
      <span
        className={cn(
          "absolute top-0.5 size-5 rounded-full bg-white shadow transition-all",
          on ? "left-[22px]" : "left-0.5",
        )}
      />
    </button>
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

function NewTemplateModal({ categories, onClose }: { categories: string[]; onClose: () => void }) {
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState(categories[0] ?? "Account");
  const [body, setBody] = useState("");
  const [done, setDone] = useState(false);

  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-black/60 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="glass w-full max-w-lg rounded-2xl p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-base font-bold">New Email Template</h3>
          <button onClick={onClose} aria-label="Close" className="text-muted-2 hover:text-foreground">
            <X className="size-5" />
          </button>
        </div>

        {done ? (
          <div className="py-8 text-center">
            <CheckCircle2 className="mx-auto size-10 text-safe" />
            <p className="mt-3 font-semibold">Template saved</p>
            <p className="mx-auto mt-1 max-w-sm text-sm text-muted-2">
              This is a preview — templates aren&apos;t persisted to a mail provider yet. Your{" "}
              <span className="font-semibold text-foreground">{category}</span> template is drafted and ready.
            </p>
            <div className="mt-5 flex justify-center">
              <Button size="sm" onClick={onClose}>
                Done
              </Button>
            </div>
          </div>
        ) : (
          <>
            <label className="mt-4 block text-[12px] font-semibold text-muted">Template name</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} autoFocus placeholder="e.g. Welcome Email" className="mt-1.5" />

            <div className="mt-3 grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[12px] font-semibold text-muted">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-border bg-white/5 px-3 py-2.5 text-sm outline-none transition focus:border-primary/60"
                >
                  {categories.map((c) => (
                    <option key={c} value={c} className="bg-bg-elevated">
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-muted">Subject</label>
                <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject line" className="mt-1.5" />
              </div>
            </div>

            <label className="mt-3 block text-[12px] font-semibold text-muted">Body</label>
            <Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Write the email body… use {tokens} for personalization." className="mt-1.5 min-h-28" />

            <div className="mt-5 flex justify-end gap-2">
              <Button variant="secondary" size="sm" onClick={onClose}>
                Cancel
              </Button>
              <Button size="sm" onClick={() => setDone(true)} disabled={!name.trim() || !subject.trim()}>
                Save Template
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
