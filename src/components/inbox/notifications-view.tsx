"use client";

import Link from "next/link";
import { Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { useDismissed } from "@/lib/use-dismissed";
import { Poster } from "@/components/media/poster";
import { NotifAvatar, NotifText } from "@/components/inbox/notif-visuals";
import { notificationHref } from "@/lib/notif-link";
import type { NotificationItem } from "@/lib/queries";

type Tab = "all" | "unread" | "mentions";

export function NotificationsView({ items }: { items: NotificationItem[] }) {
  const { dismissed, dismiss } = useDismissed("notifications");
  const [readIds, setReadIds] = useState<Set<string>>(() => new Set(items.filter((n) => !n.unread).map((n) => n.id)));
  const [tab, setTab] = useState<Tab>("all");

  const live = useMemo(() => items.filter((n) => !dismissed.has(n.id)), [items, dismissed]);
  const isRead = (id: string) => readIds.has(id);
  const unread = live.filter((n) => !isRead(n.id)).length;
  const mentions = live.filter((n) => n.type === "mention").length;

  const shown = live.filter((n) => {
    if (tab === "unread") return !isRead(n.id);
    if (tab === "mentions") return n.type === "mention";
    return true;
  });

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 md:px-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-extrabold tracking-tight">Notifications</h1>
          {unread > 0 && (
            <span className="rounded-full bg-primary/15 px-2.5 py-1 text-[12px] font-semibold text-primary">{unread} new</span>
          )}
        </div>
        <div className="flex items-center gap-4">
          {unread > 0 && (
            <button
              onClick={() => setReadIds(new Set(items.map((n) => n.id)))}
              className="text-[13px] font-semibold text-primary transition-colors hover:text-primary-strong"
            >
              Mark all as read
            </button>
          )}
          {live.length > 0 && (
            <button
              onClick={() => live.forEach((n) => dismiss(n.id))}
              className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-muted transition-colors hover:text-danger"
            >
              <Trash2 className="size-4" /> Clear all
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-4 flex items-center gap-6 border-b border-border">
        {(
          [
            { key: "all", label: "All", count: 0 },
            { key: "unread", label: "Unread", count: unread },
            { key: "mentions", label: "Mentions", count: mentions },
          ] as const
        ).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "-mb-px flex items-center gap-1.5 border-b-2 pb-2.5 text-[14px] font-semibold transition-colors",
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

      {shown.length === 0 ? (
        <div className="panel rounded-2xl p-10 text-center">
          <p className="font-semibold">
            {tab === "mentions" ? "No mentions yet" : tab === "unread" ? "You're all caught up" : "Nothing here yet"}
          </p>
          <p className="mt-1 text-sm text-muted-2">Nothing to show in this tab right now.</p>
        </div>
      ) : (
        <div className="panel divide-y divide-border-soft overflow-hidden rounded-2xl">
          {shown.map((n) => {
            const unreadRow = !isRead(n.id);
            const href = notificationHref(n);
            return (
              <div
                key={n.id}
                className={cn("flex items-start gap-3 px-4 py-3.5 transition-colors hover:bg-white/[0.03]", unreadRow && "bg-primary/[0.05]")}
              >
                <Link
                  href={href}
                  onClick={() => setReadIds((p) => new Set(p).add(n.id))}
                  className="flex min-w-0 flex-1 items-start gap-3"
                >
                  <NotifAvatar n={n} />
                  <NotifText n={n} />
                  <div className="flex shrink-0 flex-col items-end gap-1 pl-1">
                    <span className="whitespace-nowrap text-[11px] text-muted-2">{n.time}</span>
                    <span className={cn("size-2 rounded-full", unreadRow ? "bg-primary" : "bg-white/15")} />
                  </div>
                </Link>

                {n.media && (
                  <Link href={href} onClick={() => setReadIds((p) => new Set(p).add(n.id))} className="shrink-0">
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

                <button
                  aria-label="Delete notification"
                  onClick={() => dismiss(n.id)}
                  className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg text-muted-2 transition-colors hover:bg-danger/15 hover:text-danger"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
