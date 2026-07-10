"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Bell,
  Mail,
  MessageCircle,
  Heart,
  AtSign,
  UserPlus,
  Ticket,
  Pin,
  Tv,
  EyeOff,
  Smile,
  Flag,
  ShieldAlert,
  TrendingUp,
  Users,
  BarChart3,
  Megaphone,
  Lock,
  DoorOpen,
  LifeBuoy,
  Sparkles,
  AlertTriangle,
  Shield,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { NotificationItem, MessageItem } from "@/lib/queries";

/* ---------------------------------------------------------- shared dismiss */

function useDismiss(open: boolean, close: () => void) {
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

const NOTIF_ICONS: Record<NotificationItem["type"], React.ComponentType<{ className?: string }>> = {
  reply: MessageCircle,
  like: Heart,
  mention: AtSign,
  follow: UserPlus,
  invite: Ticket,
  pinned: Pin,
  episode: Tv,
  hidden: EyeOff,
  reaction: Smile,
  report: Flag,
  warning: ShieldAlert,
  trending: TrendingUp,
  friend: Users,
  poll: BarChart3,
};

export function NotificationBell({ notifications }: { notifications: NotificationItem[] }) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const ref = useDismiss(open, close);
  const [read, setRead] = useState<boolean[]>(() => notifications.map((n) => !n.unread));
  const unread = read.filter((r) => !r).length;

  return (
    <div className="relative" ref={ref}>
      <button aria-label="Notifications" onClick={() => setOpen((v) => !v)} className={triggerCls} aria-expanded={open}>
        <Bell className="size-[18px]" />
        {!open && <Badge count={unread} />}
      </button>

      {open && (
        <div
          className="panel absolute right-0 top-full z-50 mt-2 w-[22rem] overflow-hidden rounded-2xl border border-border shadow-2xl"
          role="menu"
        >
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div className="flex items-center gap-2">
              <p className="text-sm font-bold">Notifications</p>
              {unread > 0 && (
                <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-semibold text-primary">
                  {unread} new
                </span>
              )}
            </div>
            {unread > 0 && (
              <button
                onClick={() => setRead(notifications.map(() => true))}
                className="inline-flex items-center gap-1 text-[12px] font-semibold text-muted transition-colors hover:text-foreground"
              >
                <Check className="size-3.5" /> Mark all read
              </button>
            )}
          </div>

          <div className="max-h-[70vh] overflow-y-auto">
            {notifications.map((n, i) => {
              const Icon = NOTIF_ICONS[n.type] ?? MessageCircle;
              const isUnread = !read[i];
              return (
                <Link
                  key={i}
                  href={n.href}
                  onClick={() => {
                    setRead((prev) => prev.map((r, j) => (j === i ? true : r)));
                    close();
                  }}
                  className={cn(
                    "flex items-start gap-3 px-4 py-3 transition-colors hover:bg-white/5",
                    isUnread && "bg-primary/[0.06]",
                  )}
                >
                  <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-white/5 text-primary">
                    <Icon className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] leading-snug text-foreground">{n.text}</span>
                    <span className="mt-0.5 block text-[11px] text-muted-2">{n.time}</span>
                  </span>
                  {isUnread && <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" />}
                </Link>
              );
            })}
          </div>

          <Link
            href="/notifications"
            onClick={close}
            className="block border-t border-border py-2.5 text-center text-[13px] font-semibold text-primary transition-colors hover:bg-white/5"
          >
            View all notifications
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
  const ref = useDismiss(open, close);
  const [read, setRead] = useState<boolean[]>(() => messages.map((m) => !m.unread));
  const unread = read.filter((r) => !r).length;

  return (
    <div className="relative" ref={ref}>
      <button aria-label="Messages" onClick={() => setOpen((v) => !v)} className={triggerCls} aria-expanded={open}>
        <Mail className="size-[18px]" />
        {!open && <Badge count={unread} />}
      </button>

      {open && (
        <div
          className="panel absolute right-0 top-full z-50 mt-2 w-[24rem] overflow-hidden rounded-2xl border border-border shadow-2xl"
          role="menu"
        >
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div className="flex items-center gap-2">
              <p className="text-sm font-bold">Inbox</p>
              {unread > 0 && (
                <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-semibold text-primary">
                  {unread} unread
                </span>
              )}
            </div>
            {unread > 0 && (
              <button
                onClick={() => setRead(messages.map(() => true))}
                className="inline-flex items-center gap-1 text-[12px] font-semibold text-muted transition-colors hover:text-foreground"
              >
                <Check className="size-3.5" /> Mark all read
              </button>
            )}
          </div>

          <div className="max-h-[70vh] overflow-y-auto">
            {messages.map((m, i) => {
              const Icon = MSG_ICONS[m.kind] ?? Mail;
              const isUnread = !read[i];
              return (
                <Link
                  key={i}
                  href="/inbox"
                  onClick={() => {
                    setRead((prev) => prev.map((r, j) => (j === i ? true : r)));
                    close();
                  }}
                  className={cn(
                    "flex items-start gap-3 px-4 py-3 transition-colors hover:bg-white/5",
                    isUnread && "bg-primary/[0.06]",
                  )}
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
                        <span className="rounded bg-white/10 px-1.5 py-px text-[10px] font-medium text-muted-2">
                          Official
                        </span>
                      )}
                    </span>
                    <span className="block truncate text-[12px] font-medium text-foreground/90">{m.subject}</span>
                    <span className="mt-0.5 line-clamp-1 block text-[11px] text-muted-2">{m.preview}</span>
                  </span>
                  <span className="shrink-0 text-[11px] text-muted-2">{m.time}</span>
                </Link>
              );
            })}
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
