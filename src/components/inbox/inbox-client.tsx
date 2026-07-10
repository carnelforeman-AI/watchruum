"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  SquarePen,
  ArrowLeft,
  Pin,
  Trash2,
  Archive,
  MoreHorizontal,
  Star,
  Send,
  CheckCircle2,
  Bug,
  MessageSquare,
  BookOpen,
  ChevronRight,
  Mail,
  MailOpen,
  Shield,
  ShieldAlert,
  AlertTriangle,
  Megaphone,
  Lock,
  DoorOpen,
  Users,
  LifeBuoy,
  Flag,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useDismissed } from "@/lib/use-dismissed";
import type { MessageItem, MessageKind, MessageQuickLink } from "@/lib/queries";

const KIND_STYLE: Record<MessageKind, { Icon: React.ComponentType<{ className?: string }>; tile: string }> = {
  admin: { Icon: Shield, tile: "bg-primary/15 text-primary" },
  moderator: { Icon: ShieldAlert, tile: "bg-danger/15 text-danger" },
  warning: { Icon: AlertTriangle, tile: "bg-warn/15 text-warn" },
  announcement: { Icon: Megaphone, tile: "bg-primary/15 text-primary" },
  security: { Icon: Lock, tile: "bg-warn/15 text-warn" },
  invite: { Icon: DoorOpen, tile: "bg-warn/15 text-warn" },
  room: { Icon: Users, tile: "bg-accent/15 text-accent" },
  support: { Icon: LifeBuoy, tile: "bg-safe/15 text-safe" },
  report: { Icon: Flag, tile: "bg-accent/15 text-accent" },
  feature: { Icon: Sparkles, tile: "bg-primary/15 text-primary" },
};

const QL_ICON: Record<MessageQuickLink["icon"], React.ComponentType<{ className?: string }>> = {
  bug: Bug,
  feedback: MessageSquare,
  guide: BookOpen,
  link: ChevronRight,
};

type Tab = "all" | "unread" | "important" | "archive";

export function InboxClient({ items, initialId }: { items: MessageItem[]; initialId?: string }) {
  const { dismissed, dismiss } = useDismissed("messages");
  const [readIds, setReadIds] = useState<Set<string>>(() => new Set(items.filter((m) => !m.unread).map((m) => m.id)));
  const [starIds, setStarIds] = useState<Set<string>>(() => new Set(items.filter((m) => m.starred).map((m) => m.id)));
  const [pinIds, setPinIds] = useState<Set<string>>(() => new Set());
  const [archIds, setArchIds] = useState<Set<string>>(() => new Set());
  const [tab, setTab] = useState<Tab>("all");
  const [reply, setReply] = useState("");
  const [composing, setComposing] = useState(false);

  const notDismissed = useMemo(() => items.filter((m) => !dismissed.has(m.id)), [items, dismissed]);
  const inbox = notDismissed.filter((m) => !archIds.has(m.id));

  const validInitial = initialId && notDismissed.some((m) => m.id === initialId) ? initialId : undefined;
  const [selectedId, setSelectedId] = useState<string | null>(validInitial ?? inbox[0]?.id ?? null);
  const [mobileOpen, setMobileOpen] = useState<boolean>(!!validInitial);

  const isRead = (id: string) => readIds.has(id);
  const unreadCount = inbox.filter((m) => !isRead(m.id)).length;

  const listFor = (t: Tab): MessageItem[] => {
    if (t === "archive") return notDismissed.filter((m) => archIds.has(m.id));
    if (t === "unread") return inbox.filter((m) => !isRead(m.id));
    if (t === "important") return inbox.filter((m) => starIds.has(m.id));
    return inbox;
  };
  const list = listFor(tab);
  const selected = selectedId ? notDismissed.find((m) => m.id === selectedId) ?? null : null;

  const markRead = (id: string) => setReadIds((p) => new Set(p).add(id));
  const toggleRead = (id: string) =>
    setReadIds((p) => {
      const n = new Set(p);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  const toggleSet = (setFn: React.Dispatch<React.SetStateAction<Set<string>>>, id: string) =>
    setFn((p) => {
      const n = new Set(p);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  const select = (id: string) => {
    setComposing(false);
    setSelectedId(id);
    markRead(id);
    setMobileOpen(true);
  };
  const remove = (id: string) => {
    const rest = list.filter((m) => m.id !== id);
    dismiss(id);
    if (selectedId === id) {
      setSelectedId(rest[0]?.id ?? null);
      setMobileOpen(false);
    }
  };

  // Unread / Earlier grouping only on the "All" tab.
  const groups: { label: string; rows: MessageItem[] }[] =
    tab === "all"
      ? [
          { label: "Unread", rows: inbox.filter((m) => !isRead(m.id)) },
          { label: "Earlier", rows: inbox.filter((m) => isRead(m.id)) },
        ].filter((g) => g.rows.length > 0)
      : [{ label: "", rows: list }];

  return (
    <div className="flex flex-col lg:h-[calc(100vh-4rem)] lg:flex-row lg:overflow-hidden">
      {/* ---------- List pane ---------- */}
      <aside
        className={cn(
          "flex w-full flex-col border-border lg:h-full lg:w-[380px] lg:shrink-0 lg:border-r",
          mobileOpen && "hidden lg:flex",
        )}
      >
        <div className="flex items-center justify-between px-5 pb-3 pt-5">
          <h1 className="text-2xl font-extrabold tracking-tight">Inbox</h1>
          <button
            onClick={() => {
              setComposing(true);
              setSelectedId(null);
              setMobileOpen(true);
            }}
            aria-label="Compose"
            className="grid size-9 place-items-center rounded-xl border border-border text-primary transition-colors hover:bg-primary/10"
          >
            <SquarePen className="size-[18px]" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2 px-5 pb-3">
          {(
            [
              { key: "all", label: "All" },
              { key: "unread", label: "Unread", count: unreadCount },
              { key: "important", label: "Important" },
              { key: "archive", label: "Archive" },
            ] as const
          ).map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-semibold transition-colors",
                tab === t.key ? "bg-primary/15 text-primary ring-1 ring-primary/30" : "text-muted hover:bg-white/5 hover:text-foreground",
              )}
            >
              {t.label}
              {"count" in t && t.count! > 0 && (
                <span className="grid min-w-5 place-items-center rounded-full bg-primary px-1 text-[11px] font-bold text-white">
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto pb-6 lg:pb-0">
          {list.length === 0 ? (
            <p className="px-5 py-12 text-center text-[13px] text-muted-2">
              {tab === "archive" ? "Nothing archived." : tab === "important" ? "Nothing marked important." : tab === "unread" ? "No unread messages." : "Your inbox is empty."}
            </p>
          ) : (
            groups.map((g) => (
              <div key={g.label || "flat"}>
                {g.label && (
                  <p className="px-5 pb-1 pt-3 text-[11px] font-bold uppercase tracking-widest text-muted-2">{g.label}</p>
                )}
                {g.rows.map((m) => {
                  const unread = !isRead(m.id);
                  const active = m.id === selectedId;
                  const { Icon, tile } = KIND_STYLE[m.kind];
                  return (
                    <button
                      key={m.id}
                      onClick={() => select(m.id)}
                      className={cn(
                        "flex w-full items-start gap-3 border-b border-border-soft px-5 py-3.5 text-left transition-colors hover:bg-white/[0.03]",
                        active && "bg-primary/10 lg:ring-1 lg:ring-inset lg:ring-primary/25",
                      )}
                    >
                      {unread ? (
                        <span className="mt-2 size-2 shrink-0 rounded-full bg-primary" />
                      ) : (
                        <span className="mt-2 size-2 shrink-0" />
                      )}
                      <span className={cn("grid size-10 shrink-0 place-items-center rounded-full", tile)}>
                        <Icon className="size-5" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className={cn("truncate text-[14px]", unread ? "font-bold text-foreground" : "font-semibold text-foreground/90")}>
                            {m.from}
                          </span>
                          <span className="ml-auto shrink-0 text-[11px] text-muted-2">{m.time}</span>
                        </span>
                        <span className={cn("mt-0.5 block truncate text-[13px]", unread ? "font-semibold text-foreground" : "text-foreground/80")}>
                          {m.subject}
                        </span>
                        <span className="mt-0.5 line-clamp-2 block text-[12px] leading-snug text-muted-2">{m.preview}</span>
                      </span>
                      <span className="mt-0.5 shrink-0">
                        {unread ? (
                          <span className="grid size-5 place-items-center rounded-full bg-primary text-[11px] font-bold text-white">1</span>
                        ) : starIds.has(m.id) ? (
                          <Star className="size-4 fill-warn text-warn" />
                        ) : (
                          <Star className="size-4 text-muted-2/40" />
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>
            ))
          )}
          {list.length > 0 && (
            <div className="px-5 py-4 text-center">
              <span className="text-[13px] font-semibold text-muted-2">That&apos;s everything</span>
            </div>
          )}
        </div>
      </aside>

      {/* ---------- Reading pane ---------- */}
      <section className={cn("flex flex-1 flex-col lg:h-full", !mobileOpen && "hidden lg:flex")}>
        {composing ? (
          <ComposePlaceholder onBack={() => setMobileOpen(false)} />
        ) : !selected ? (
          <div className="flex flex-1 items-center justify-center p-10 text-center">
            <div>
              <Mail className="mx-auto size-10 text-muted-2/50" />
              <p className="mt-3 font-semibold">Select a message</p>
              <p className="mt-1 text-sm text-muted-2">Pick a message from your inbox to read it here.</p>
            </div>
          </div>
        ) : (
          <ReadingPane
            m={selected}
            starred={starIds.has(selected.id)}
            pinned={pinIds.has(selected.id)}
            reply={reply}
            setReply={setReply}
            onBack={() => setMobileOpen(false)}
            onStar={() => toggleSet(setStarIds, selected.id)}
            onPin={() => toggleSet(setPinIds, selected.id)}
            onArchive={() => {
              toggleSet(setArchIds, selected.id);
              setMobileOpen(false);
            }}
            onDelete={() => remove(selected.id)}
            onToggleRead={() => toggleRead(selected.id)}
            isRead={isRead(selected.id)}
          />
        )}
      </section>
    </div>
  );
}

/* ---------------------------------------------------------- reading pane */

function ReadingPane({
  m,
  starred,
  pinned,
  reply,
  setReply,
  onBack,
  onStar,
  onPin,
  onArchive,
  onDelete,
  onToggleRead,
  isRead,
}: {
  m: MessageItem;
  starred: boolean;
  pinned: boolean;
  reply: string;
  setReply: (v: string) => void;
  onBack: () => void;
  onStar: () => void;
  onPin: () => void;
  onArchive: () => void;
  onDelete: () => void;
  onToggleRead: () => void;
  isRead: boolean;
}) {
  const [menu, setMenu] = useState(false);
  const { Icon, tile } = KIND_STYLE[m.kind];

  return (
    <>
      {/* Toolbar */}
      <div className="flex items-center gap-1 border-b border-border px-3 py-2.5">
        <button onClick={onBack} aria-label="Back" className="grid size-9 place-items-center rounded-lg text-muted transition-colors hover:bg-white/5 hover:text-foreground lg:hidden">
          <ArrowLeft className="size-[18px]" />
        </button>
        <div className="flex-1" />
        <ToolBtn label={pinned ? "Unpin" : "Pin"} active={pinned} onClick={onPin}>
          <Pin className={cn("size-[18px]", pinned && "fill-current")} />
        </ToolBtn>
        <ToolBtn label="Delete" onClick={onDelete}>
          <Trash2 className="size-[18px]" />
        </ToolBtn>
        <ToolBtn label="Archive" onClick={onArchive}>
          <Archive className="size-[18px]" />
        </ToolBtn>
        <div className="relative">
          <ToolBtn label="More" active={menu} onClick={() => setMenu((v) => !v)}>
            <MoreHorizontal className="size-[18px]" />
          </ToolBtn>
          {menu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenu(false)} />
              <div className="absolute right-0 top-11 z-20 w-44 overflow-hidden rounded-xl border border-border bg-panel p-1 shadow-2xl">
                <button
                  onClick={() => {
                    onToggleRead();
                    setMenu(false);
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[13px] font-medium hover:bg-white/5"
                >
                  <MailOpen className="size-4" /> Mark as {isRead ? "unread" : "read"}
                </button>
                <button
                  onClick={() => {
                    onStar();
                    setMenu(false);
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[13px] font-medium hover:bg-white/5"
                >
                  <Star className={cn("size-4", starred && "fill-warn text-warn")} /> {starred ? "Remove star" : "Add star"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Body scroll */}
      <div className="flex-1 lg:overflow-y-auto">
        <div className="mx-auto max-w-2xl px-5 py-6 md:px-8">
          <div className="flex items-start justify-between gap-3">
            <h2 className="flex items-center gap-2 text-2xl font-extrabold tracking-tight">
              {m.subject}
              {m.isNew && (
                <span className="rounded-md bg-primary/20 px-1.5 py-0.5 text-[11px] font-bold text-primary">New</span>
              )}
            </h2>
            <button onClick={onStar} aria-label="Star" className="mt-1 shrink-0 text-muted-2 transition-colors hover:text-warn">
              <Star className={cn("size-5", starred && "fill-warn text-warn")} />
            </button>
          </div>

          <div className="mt-4 flex items-center gap-3">
            <span className={cn("grid size-11 shrink-0 place-items-center rounded-full", tile)}>
              <Icon className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-semibold">{m.from}</p>
              <p className="text-[12px] text-muted-2">to {m.to ?? "you"}</p>
            </div>
            <span className="shrink-0 text-[12px] text-muted-2">{m.time}</span>
          </div>

          <div className="mt-6 space-y-4">
            <p className="whitespace-pre-line text-[14px] leading-relaxed text-foreground/90">{m.body}</p>

            {m.checklistIntro && <p className="text-[14px] font-medium text-foreground/90">{m.checklistIntro}</p>}
            {m.checklist && m.checklist.length > 0 && (
              <ul className="space-y-2.5">
                {m.checklist.map((c) => (
                  <li key={c} className="flex items-center gap-2.5 text-[14px] text-foreground/90">
                    <CheckCircle2 className="size-[18px] shrink-0 text-primary" />
                    {c}
                  </li>
                ))}
              </ul>
            )}
            {m.bodyAfter && <p className="whitespace-pre-line text-[14px] leading-relaxed text-foreground/90">{m.bodyAfter}</p>}
          </div>

          {m.quickLinks && m.quickLinks.length > 0 && (
            <div className="mt-8">
              <h3 className="mb-3 text-lg font-bold">Quick Links</h3>
              <div className="space-y-2.5">
                {m.quickLinks.map((q) => {
                  const QI = QL_ICON[q.icon] ?? ChevronRight;
                  return (
                    <Link
                      key={q.label}
                      href={q.href}
                      className="glass-hover flex items-center gap-3 rounded-xl border border-border bg-white/[0.03] px-4 py-3.5 transition-colors hover:bg-white/[0.06]"
                    >
                      <QI className="size-5 text-primary" />
                      <span className="flex-1 text-[14px] font-semibold">{q.label}</span>
                      <ChevronRight className="size-4 text-muted-2" />
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Reply composer */}
      <div className="border-t border-border p-3 md:px-8 md:py-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setReply("");
          }}
          className="mx-auto flex max-w-2xl items-center gap-3"
        >
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-primary to-accent text-[12px] font-bold text-white">
            You
          </span>
          <div className="flex flex-1 items-center rounded-xl border border-border bg-white/5 pr-1 focus-within:border-primary/60">
            <input
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              placeholder="Write a reply…"
              className="h-11 w-full bg-transparent px-3.5 text-sm placeholder:text-muted-2 focus-visible:outline-none"
            />
            <button
              type="submit"
              aria-label="Send"
              disabled={!reply.trim()}
              className="grid size-9 shrink-0 place-items-center rounded-lg text-primary transition-colors hover:bg-primary/10 disabled:text-muted-2/40"
            >
              <Send className="size-[18px]" />
            </button>
          </div>
        </form>
        <p className="mx-auto mt-1.5 max-w-2xl text-center text-[11px] text-muted-2/70">
          Demo inbox — replies aren&apos;t delivered yet.
        </p>
      </div>
    </>
  );
}

function ToolBtn({
  children,
  label,
  active,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className={cn(
        "grid size-9 place-items-center rounded-lg transition-colors hover:bg-white/5",
        active ? "text-primary" : "text-muted hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

function ComposePlaceholder({ onBack }: { onBack: () => void }) {
  return (
    <>
      <div className="flex items-center gap-1 border-b border-border px-3 py-2.5">
        <button onClick={onBack} aria-label="Back" className="grid size-9 place-items-center rounded-lg text-muted hover:bg-white/5 hover:text-foreground lg:hidden">
          <ArrowLeft className="size-[18px]" />
        </button>
      </div>
      <div className="flex flex-1 items-center justify-center p-10 text-center">
        <div>
          <SquarePen className="mx-auto size-10 text-muted-2/50" />
          <p className="mt-3 font-semibold">Direct messages are coming soon</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted-2">
            You&apos;ll be able to start conversations with other fans here. For now, your inbox holds updates from the
            Watchruum team.
          </p>
        </div>
      </div>
    </>
  );
}
