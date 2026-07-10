"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Bell,
  Mail,
  Settings,
  Check,
  Trash2,
  MoreHorizontal,
  ChevronRight,
  LayoutGrid,
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
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useDismissed } from "@/lib/use-dismissed";
import { Poster } from "@/components/media/poster";
import { NotifAvatar, NotifText } from "@/components/inbox/notif-visuals";
import type { NotificationItem, MessageItem } from "@/lib/queries";

/* ---------------------------------------------------------- shared helpers */

function useOutside(open: boolean, close: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    function onPointer(e: PointerEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) close();
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, close]);
  return ref;
}

const triggerCls =
  "relative grid size-10 place-items-center rounded-xl text-muted transition-colors hover:bg-white/5 hover:text-foreground";

function Badge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="absolute -right-0.5 -top-0.5 grid min-w-[18px] place-items-center rounded-full bg-primary px-1 text-[10px] font-bold leading-[18px] text-white ring-2 ring-bg">
      {count > 9 ? "9+" : count}
    </span>
  );
}

/* ------------------------------------------------------------------- bell */

type Tab = "all" | "unread" | "mentions";

export function NotificationBell({ notifications }: { notifications: NotificationItem[] }) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const ref = useOutside(open, close);
  const { dismissed, dismiss } = useDismissed("notifications");
  const [readIds, setReadIds] = useState<Set<string>>(
    () => new Set(notifications.filter((n) => !n.unread).map((n) => n.id)),
  );
  const [tab, setTab] = useState<Tab>("all");
  const [menuId, setMenuId] = useState<string | null>(null);

  const live = useMemo(() => notifications.filter((n) => !dismissed.has(n.id)), [notifications, dismissed]);
  const isRead = (id: string) => readIds.has(id);
  const unreadCount = live.filter((n) => !isRead(n.id)).length;
  const mentionCount = live.filter((n) => n.type === "mention").length;

  const shown = live.filter((n) => {
    if (tab === "unread") return !isRead(n.id);
    if (tab === "mentions") return n.type === "mention";
    return true;
  });

  const markRead = (id: string) => setReadIds((p) => new Set(p).add(id));
  const markUnread = (id: string) =>
    setReadIds((p) => {
      const next = new Set(p);
      next.delete(id);
      return next;
    });
  const markAllRead = () => setReadIds(new Set(notifications.map((n) => n.id)));

  return (
    <div className="relative" ref={ref}>
      <button aria-label="Notifications" onClick={() => setOpen((v) => !v)} className={triggerCls} aria-expanded={open}>
        <Bell className="size-[18px]" />
        {!open && <Badge count={unreadCount} />}
      </button>

      {open && (
        <div
          className="panel absolute right-0 top-full z-50 mt-2 w-[26rem] max-w-[92vw] overflow-hidden rounded-2xl border border-border shadow-2xl"
          role="menu"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 pt-4">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-extrabold tracking-tight">Notifications</h2>
              {unreadCount > 0 && (
                <span className="grid min-w-6 place-items-center rounded-full bg-primary/20 px-1.5 py-0.5 text-[12px] font-bold text-primary">
                  {unreadCount}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              {unreadCount > 0 && (
                <button onClick={markAllRead} className="text-[13px] font-semibold text-primary transition-colors hover:text-primary-strong">
                  Mark all as read
                </button>
              )}
              <Link href="/settings" onClick={close} aria-label="Notification settings" className="text-muted-2 transition-colors hover:text-foreground">
                <Settings className="size-[18px]" />
              </Link>
            </div>
          </div>

          {/* Tabs */}
          <div className="mt-3 flex items-center gap-5 border-b border-border px-4">
            {(
              [
                { key: "all", label: "All", count: 0 },
                { key: "unread", label: "Unread", count: unreadCount },
                { key: "mentions", label: "Mentions", count: mentionCount },
              ] as const
            ).map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={cn(
                  "-mb-px flex items-center gap-1.5 border-b-2 pb-2.5 pt-1 text-[13px] font-semibold transition-colors",
                  tab === t.key ? "border-primary text-primary" : "border-transparent text-muted hover:text-foreground",
                )}
              >
                {t.label}
                {t.key !== "all" && t.count > 0 && (
                  <span className="grid min-w-5 place-items-center rounded-full bg-white/10 px-1 text-[11px] font-bold text-foreground">
                    {t.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* List */}
          <div className="max-h-[65vh] overflow-y-auto">
            {shown.length === 0 ? (
              <p className="px-4 py-10 text-center text-[13px] text-muted-2">
                {tab === "mentions" ? "No mentions yet." : tab === "unread" ? "You're all caught up." : "Nothing here yet."}
              </p>
            ) : (
              shown.map((n) => {
                const unread = !isRead(n.id);
                return (
                  <div
                    key={n.id}
                    className={cn(
                      "relative flex items-start gap-3 border-b border-border-soft px-4 py-3 transition-colors last:border-b-0 hover:bg-white/[0.03]",
                      unread && "bg-primary/[0.05]",
                    )}
                  >
                    <Link
                      href={`/notifications/${n.id}`}
                      onClick={() => {
                        markRead(n.id);
                        close();
                      }}
                      className="flex min-w-0 flex-1 items-start gap-3"
                    >
                      <NotifAvatar n={n} />
                      <NotifText n={n} />
                      <div className="flex shrink-0 flex-col items-end gap-1 pl-1">
                        <span className="whitespace-nowrap text-[11px] text-muted-2">{n.time}</span>
                        <span className={cn("size-2 rounded-full", unread ? "bg-primary" : "bg-white/15")} />
                      </div>
                    </Link>

                    {n.media && (
                      <Link href={`/notifications/${n.id}`} onClick={() => { markRead(n.id); close(); }} className="shrink-0">
                        <Poster
                          title={n.media.title}
                          src={n.media.poster}
                          genres={n.media.genres}
                          showTitle={false}
                          rounded="rounded-lg"
                          className="size-14 ring-1 ring-white/10"
                        />
                      </Link>
                    )}

                    {/* Action column */}
                    <div className="flex shrink-0 flex-col items-center gap-1">
                      <button
                        aria-label="More"
                        onClick={() => setMenuId((v) => (v === n.id ? null : n.id))}
                        className="grid size-6 place-items-center rounded-md text-muted-2 transition-colors hover:bg-white/10 hover:text-foreground"
                      >
                        <MoreHorizontal className="size-4" />
                      </button>
                      <button
                        aria-label="Delete notification"
                        onClick={() => dismiss(n.id)}
                        className="grid size-6 place-items-center rounded-md text-muted-2 transition-colors hover:bg-danger/15 hover:text-danger"
                      >
                        <Trash2 className="size-4" />
                      </button>

                      {menuId === n.id && (
                        <div className="absolute right-3 top-10 z-10 w-44 overflow-hidden rounded-xl border border-border bg-panel p-1 shadow-2xl">
                          <button
                            onClick={() => {
                              unread ? markRead(n.id) : markUnread(n.id);
                              setMenuId(null);
                            }}
                            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[13px] font-medium text-foreground hover:bg-white/5"
                          >
                            <Check className="size-4" /> Mark as {unread ? "read" : "unread"}
                          </button>
                          <button
                            onClick={() => {
                              dismiss(n.id);
                              setMenuId(null);
                            }}
                            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[13px] font-medium text-danger hover:bg-danger/10"
                          >
                            <Trash2 className="size-4" /> Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <Link
            href="/notifications"
            onClick={close}
            className="flex items-center justify-center gap-2 border-t border-border py-3 text-[13px] font-semibold text-primary transition-colors hover:bg-white/5"
          >
            <LayoutGrid className="size-4" />
            View all notifications
            <ChevronRight className="size-4" />
          </Link>
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- envelope */

const MSG_ICONS: Record<MessageItem["kind"], React.ComponentType<{ className?: string }>> = {
  admin: Shield,
  moderator: ShieldAlert,
  warning: AlertTriangle,
  announcement: Megaphone,
  security: Lock,
  invite: DoorOpen,
  room: Users,
  support: LifeBuoy,
  report: Flag,
  feature: Sparkles,
};

export function MessageInbox({ messages }: { messages: MessageItem[] }) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const ref = useOutside(open, close);
  const { dismissed, dismiss } = useDismissed("messages");
  const [readIds, setReadIds] = useState<Set<string>>(
    () => new Set(messages.filter((m) => !m.unread).map((m) => m.id)),
  );

  const visible = useMemo(() => messages.filter((m) => !dismissed.has(m.id)), [messages, dismissed]);
  const unread = visible.filter((m) => !readIds.has(m.id)).length;

  const markAllRead = () => setReadIds(new Set(messages.map((m) => m.id)));
  const clearAll = () => visible.forEach((m) => dismiss(m.id));

  return (
    <div className="relative" ref={ref}>
      <button aria-label="Messages" onClick={() => setOpen((v) => !v)} className={triggerCls} aria-expanded={open}>
        <Mail className="size-[18px]" />
        {!open && <Badge count={unread} />}
      </button>

      {open && (
        <div
          className="panel absolute right-0 top-full z-50 mt-2 w-[24rem] max-w-[92vw] overflow-hidden rounded-2xl border border-border shadow-2xl"
          role="menu"
        >
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div className="flex items-center gap-2">
              <p className="text-sm font-bold">Inbox</p>
              {unread > 0 && (
                <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-semibold text-primary">{unread} unread</span>
              )}
            </div>
            <div className="flex items-center gap-3">
              {unread > 0 && (
                <button
                  onClick={markAllRead}
                  className="inline-flex items-center gap-1 text-[12px] font-semibold text-muted transition-colors hover:text-foreground"
                >
                  <MailOpen className="size-3.5" /> Mark read
                </button>
              )}
              {visible.length > 0 && (
                <button onClick={clearAll} className="text-[12px] font-semibold text-muted transition-colors hover:text-danger">
                  Clear all
                </button>
              )}
            </div>
          </div>

          <div className="max-h-[70vh] overflow-y-auto">
            {visible.length === 0 ? (
              <p className="px-4 py-8 text-center text-[13px] text-muted-2">Your inbox is empty.</p>
            ) : (
              visible.map((m) => {
                const Icon = MSG_ICONS[m.kind] ?? Mail;
                const isUnread = !readIds.has(m.id);
                return (
                  <div
                    key={m.id}
                    className={cn("flex items-start pr-2 transition-colors hover:bg-white/5", isUnread && "bg-primary/[0.06]")}
                  >
                    <Link
                      href={`/inbox?m=${m.id}`}
                      onClick={() => {
                        setReadIds((prev) => new Set(prev).add(m.id));
                        close();
                      }}
                      className="flex min-w-0 flex-1 items-start gap-3 py-3 pl-4"
                    >
                      <span
                        className={cn(
                          "mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg",
                          m.official ? "bg-primary/15 text-primary" : "bg-white/5 text-foreground",
                        )}
                      >
                        <Icon className="size-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1.5">
                          <span className="truncate text-[13px] font-semibold text-foreground">{m.from}</span>
                          {m.official && (
                            <span className="rounded bg-white/10 px-1.5 py-px text-[10px] font-medium text-muted-2">Official</span>
                          )}
                        </span>
                        <span className="block truncate text-[12px] font-medium text-foreground/90">{m.subject}</span>
                        <span className="mt-0.5 line-clamp-1 block text-[11px] text-muted-2">{m.preview}</span>
                      </span>
                      <span className="shrink-0 text-[11px] text-muted-2">{m.time}</span>
                    </Link>
                    <button
                      type="button"
                      aria-label="Delete message"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        dismiss(m.id);
                      }}
                      className="mt-2.5 grid size-6 shrink-0 place-items-center rounded-md text-muted-2 transition-colors hover:bg-danger/15 hover:text-danger"
                    >
                      <X className="size-3.5" />
                    </button>
                  </div>
                );
              })
            )}
          </div>

          <Link
            href="/inbox"
            onClick={close}
            className="block border-t border-border py-2.5 text-center text-[13px] font-semibold text-primary transition-colors hover:bg-white/5"
          >
            View all messages
          </Link>
        </div>
      )}
    </div>
  );
}
