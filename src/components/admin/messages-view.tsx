"use client";

import { useMemo, useState } from "react";
import {
  Search,
  ChevronDown,
  Filter,
  MoreVertical,
  X,
  ArrowRight,
  User,
  Users,
  Send,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { cn, initials, posterGradient } from "@/lib/utils";

export type MsgStatus = "New" | "In Progress" | "Resolved" | "Spam";
export type AssignedKind = "you" | "team" | "unassigned";

export interface SupportMessage {
  id: string;
  name: string;
  email: string;
  subject: string;
  isNew: boolean;
  preview: string;
  body: string;
  status: MsgStatus;
  assignedTo: string;
  assignedKind: AssignedKind;
  receivedDate: string;
  receivedTime: string;
  folder: string;
  unread: boolean;
  order: number;
}

type TabKey = "all" | "unread" | "mine" | "resolved" | "spam";

const STATUS_CLASS: Record<MsgStatus, string> = {
  New: "bg-primary/15 text-primary ring-primary/30",
  "In Progress": "bg-[#3b82f6]/15 text-[#3b82f6] ring-[#3b82f6]/30",
  Resolved: "bg-safe/15 text-safe ring-safe/30",
  Spam: "bg-danger/15 text-danger ring-danger/30",
};

function Avatar({ name }: { name: string }) {
  return (
    <span
      className="grid size-9 shrink-0 place-items-center rounded-full text-[12px] font-bold text-white ring-1 ring-white/10"
      style={{ background: posterGradient(name) }}
    >
      {initials(name)}
    </span>
  );
}

export function AdminMessagesView({ messages }: { messages: SupportMessage[] }) {
  const [tab, setTab] = useState<TabKey>("all");
  const [query, setQuery] = useState("");
  const [folder, setFolder] = useState("All Folders");
  const [sort, setSort] = useState<"newest" | "oldest">("newest");
  const [showFilters, setShowFilters] = useState(false);
  const [assignFilter, setAssignFilter] = useState<"all" | AssignedKind>("all");
  const [openId, setOpenId] = useState<string | null>(null);

  const folders = useMemo(
    () => ["All Folders", ...Array.from(new Set(messages.map((m) => m.folder)))],
    [messages],
  );

  const counts = useMemo(
    () => ({
      all: messages.filter((m) => m.status !== "Spam").length,
      unread: messages.filter((m) => m.unread && m.status !== "Spam").length,
      mine: messages.filter((m) => m.assignedKind === "you").length,
      resolved: messages.filter((m) => m.status === "Resolved").length,
      spam: messages.filter((m) => m.status === "Spam").length,
    }),
    [messages],
  );

  const visible = useMemo(() => {
    let list = messages.filter((m) => {
      if (tab === "spam") return m.status === "Spam";
      if (m.status === "Spam") return false;
      if (tab === "unread") return m.unread;
      if (tab === "mine") return m.assignedKind === "you";
      if (tab === "resolved") return m.status === "Resolved";
      return true;
    });
    const q = query.trim().toLowerCase();
    if (q) list = list.filter((m) => `${m.name} ${m.email} ${m.subject} ${m.preview}`.toLowerCase().includes(q));
    if (folder !== "All Folders") list = list.filter((m) => m.folder === folder);
    if (assignFilter !== "all") list = list.filter((m) => m.assignedKind === assignFilter);
    list = [...list].sort((a, b) => (sort === "newest" ? b.order - a.order : a.order - b.order));
    return list;
  }, [messages, tab, query, folder, assignFilter, sort]);

  const open = messages.find((m) => m.id === openId) ?? null;

  const TABS: { key: TabKey; label: string; count?: number }[] = [
    { key: "all", label: "All Messages", count: counts.all },
    { key: "unread", label: "Unread", count: counts.unread },
    { key: "mine", label: "Assigned to Me", count: counts.mine },
    { key: "resolved", label: "Resolved" },
    { key: "spam", label: "Spam" },
  ];

  return (
    <div className="mx-auto max-w-[1400px]">
      {/* header */}
      <div className="mb-5">
        <h1 className="text-2xl font-extrabold tracking-tight">Messages</h1>
        <p className="text-[13px] text-muted-2">View and respond to messages from your users.</p>
      </div>

      {/* tabs + controls */}
      <div className="flex flex-wrap items-center gap-3 border-b border-border pb-3">
        <div className="flex flex-wrap items-center gap-1">
          {TABS.map((t) => {
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={cn(
                  "relative inline-flex items-center gap-2 px-3.5 py-2 text-[14px] font-semibold transition",
                  active ? "text-foreground" : "text-muted hover:text-foreground",
                )}
              >
                {t.label}
                {t.count != null && t.count > 0 && (
                  <span
                    className={cn(
                      "grid min-w-5 place-items-center rounded-full px-1.5 text-[11px] font-bold",
                      active ? "bg-primary text-white" : "bg-white/10 text-muted",
                    )}
                  >
                    {t.count}
                  </span>
                )}
                {active && <span className="absolute inset-x-2 -bottom-3 h-0.5 rounded-full bg-primary" />}
              </button>
            );
          })}
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-2" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search messages..."
              className="w-[200px] rounded-xl border border-border bg-white/[0.03] py-2 pl-9 pr-3 text-[13px] outline-none transition focus:border-primary/50"
            />
          </div>
          <Select value={folder} onChange={setFolder} options={folders} />
          <Select
            value={sort === "newest" ? "Newest First" : "Oldest First"}
            onChange={(v) => setSort(v === "Newest First" ? "newest" : "oldest")}
            options={["Newest First", "Oldest First"]}
          />
          <button
            onClick={() => setShowFilters((v) => !v)}
            className={cn(
              "inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-[13px] font-semibold transition",
              showFilters || assignFilter !== "all"
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
          <span className="text-[12px] font-semibold text-muted-2">Assigned:</span>
          {(
            [
              ["all", "All"],
              ["you", "Assigned to Me"],
              ["team", "Teams"],
              ["unassigned", "Unassigned"],
            ] as const
          ).map(([k, label]) => (
            <button
              key={k}
              onClick={() => setAssignFilter(k)}
              className={cn(
                "rounded-full px-3 py-1 text-[12px] font-semibold transition",
                assignFilter === k ? "bg-primary text-white" : "border border-border bg-white/[0.03] text-muted hover:text-foreground",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {/* table */}
      <div className="glass mt-4 rounded-2xl border border-border-soft">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] text-left">
            <thead>
              <tr className="border-b border-border text-[11px] uppercase tracking-wide text-muted-2">
                <th className="px-5 py-3.5 font-semibold">User</th>
                <th className="px-3 py-3.5 font-semibold">Subject</th>
                <th className="px-3 py-3.5 font-semibold">Preview</th>
                <th className="px-3 py-3.5 font-semibold">Status</th>
                <th className="px-3 py-3.5 font-semibold">Assigned To</th>
                <th className="px-3 py-3.5 font-semibold">Received</th>
                <th className="px-3 py-3.5" />
              </tr>
            </thead>
            <tbody>
              {visible.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-sm text-muted-2">
                    No messages here.
                  </td>
                </tr>
              ) : (
                visible.map((m) => (
                  <tr
                    key={m.id}
                    onClick={() => setOpenId(m.id)}
                    className="cursor-pointer border-b border-border/60 last:border-0 hover:bg-white/[0.02]"
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <Avatar name={m.name} />
                        <div className="min-w-0">
                          <p className={cn("truncate text-[14px]", m.unread ? "font-bold" : "font-semibold")}>{m.name}</p>
                          <p className="truncate text-[12px] text-muted-2">{m.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3.5">
                      <div className="flex items-center gap-2">
                        <span className="text-[14px] font-semibold">{m.subject}</span>
                        {m.isNew && (
                          <span className="rounded bg-primary px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">
                            New
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="max-w-[280px] px-3 py-3.5">
                      <p className="line-clamp-2 text-[13px] text-muted-2">{m.preview}</p>
                    </td>
                    <td className="px-3 py-3.5">
                      <span className={cn("inline-flex rounded-md px-2 py-1 text-[11px] font-semibold ring-1", STATUS_CLASS[m.status])}>
                        {m.status}
                      </span>
                    </td>
                    <td className="px-3 py-3.5">
                      <span className="inline-flex items-center gap-1.5 text-[13px] text-muted">
                        {m.assignedKind === "you" ? <User className="size-3.5" /> : <Users className="size-3.5" />}
                        {m.assignedTo}
                      </span>
                    </td>
                    <td className="px-3 py-3.5">
                      <p className="text-[13px] font-medium">{m.receivedDate}</p>
                      <p className="text-[12px] text-muted-2">{m.receivedTime}</p>
                    </td>
                    <td className="px-3 py-3.5">
                      <button
                        aria-label="Row actions"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenId(m.id);
                        }}
                        className="grid size-7 place-items-center rounded-lg text-muted-2 transition hover:bg-white/5 hover:text-foreground"
                      >
                        <MoreVertical className="size-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="border-t border-border px-5 py-4 text-center">
          <button className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-primary hover:underline">
            View All Messages <ArrowRight className="size-4" />
          </button>
        </div>
      </div>

      {open && <MessageDetail message={open} onClose={() => setOpenId(null)} />}
    </div>
  );
}

function Select({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none rounded-xl border border-border bg-white/[0.03] py-2 pl-3.5 pr-9 text-[13px] font-semibold outline-none transition focus:border-primary/50"
      >
        {options.map((o) => (
          <option key={o} value={o} className="bg-bg-elevated">
            {o}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-2" />
    </div>
  );
}

function MessageDetail({ message, onClose }: { message: SupportMessage; onClose: () => void }) {
  const [reply, setReply] = useState("");
  const [sent, setSent] = useState(false);

  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-black/60 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="glass w-full max-w-xl rounded-2xl p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <Avatar name={message.name} />
            <div>
              <h3 className="text-base font-bold leading-tight">{message.subject}</h3>
              <p className="text-[12px] text-muted-2">
                {message.name} · {message.email}
              </p>
            </div>
          </div>
          <button onClick={onClose} aria-label="Close" className="text-muted-2 hover:text-foreground">
            <X className="size-5" />
          </button>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px]">
          <span className={cn("inline-flex rounded-md px-2 py-1 font-semibold ring-1", STATUS_CLASS[message.status])}>
            {message.status}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-md bg-white/5 px-2 py-1 font-semibold text-muted">
            {message.assignedKind === "you" ? <User className="size-3" /> : <Users className="size-3" />}
            {message.assignedTo}
          </span>
          <span className="text-muted-2">
            {message.receivedDate} · {message.receivedTime}
          </span>
        </div>

        <div className="mt-3 whitespace-pre-line rounded-xl border border-border bg-white/[0.02] px-4 py-4 text-[13px] leading-relaxed text-muted">
          {message.body}
        </div>

        {sent ? (
          <div className="mt-4 rounded-xl border border-safe/30 bg-safe/10 px-4 py-3 text-center text-[13px]">
            <CheckCircle2 className="mx-auto size-6 text-safe" />
            <p className="mt-1.5 font-semibold">Reply drafted</p>
            <p className="mt-0.5 text-muted-2">Replies aren&apos;t connected to email yet — this is a preview.</p>
            <div className="mt-3 flex justify-center">
              <Button size="sm" onClick={onClose}>
                Done
              </Button>
            </div>
          </div>
        ) : (
          <>
            <label className="mt-4 block text-[12px] font-semibold text-muted">Reply</label>
            <Textarea
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              placeholder={`Reply to ${message.name.split(" ")[0]}…`}
              className="mt-1.5 min-h-24"
            />
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="secondary" size="sm" onClick={onClose}>
                Close
              </Button>
              <Button size="sm" onClick={() => setSent(true)} disabled={!reply.trim()}>
                <Send className="size-4" /> Send Reply
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
