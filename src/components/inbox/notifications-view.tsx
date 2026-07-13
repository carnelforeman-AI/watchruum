"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Trash2, Check, BellRing, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDismissed } from "@/lib/use-dismissed";
import { Poster } from "@/components/media/poster";
import { NotifAvatar, NotifText } from "@/components/inbox/notif-visuals";
import { notificationHref } from "@/lib/notif-link";
import type { NotificationItem } from "@/lib/queries";

export interface NotifPrefs {
  messages: boolean;
  replies: boolean;
  likes: boolean;
  releases: boolean;
  reminders: boolean;
  unlocks: boolean;
  trending: boolean;
}

// Label for each backend preference, in display order.
const PREF_LABELS: [keyof NotifPrefs, string][] = [
  ["messages", "Direct Messages"],
  ["replies", "Replies & Mentions"],
  ["likes", "Likes"],
  ["reminders", "Scheduled Watch Reminders"],
  ["releases", "New Releases"],
  ["unlocks", "Discussion Unlocks"],
  ["trending", "Trending"],
];

type Filter = "all" | "unread" | "mentions" | "reminders";

const TABS: { key: Filter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "unread", label: "Unread" },
  { key: "mentions", label: "Mentions" },
  { key: "reminders", label: "Reminders" },
];

export function NotificationsView({ items, prefs }: { items: NotificationItem[]; prefs: NotifPrefs | null }) {
  const { dismissed, dismiss } = useDismissed("notifications");
  const [readIds, setReadIds] = useState<Set<string>>(() => new Set(items.filter((n) => !n.unread).map((n) => n.id)));
  const [filter, setFilter] = useState<Filter>("all");

  const live = useMemo(() => items.filter((n) => !dismissed.has(n.id)), [items, dismissed]);
  const isRead = (id: string) => readIds.has(id);
  const unread = live.filter((n) => !isRead(n.id)).length;
  const mentions = live.filter((n) => n.type === "mention").length;
  const reminders = live.filter((n) => n.type === "reminder" && !isRead(n.id)).length;

  const enabled = prefs ? PREF_LABELS.filter(([k]) => prefs[k]).map(([, l]) => l) : [];

  const tabCount = (key: Filter) => (key === "unread" ? unread : key === "mentions" ? mentions : key === "reminders" ? reminders : live.length);

  const shown = live.filter((n) => {
    if (filter === "all") return true;
    if (filter === "unread") return !isRead(n.id);
    if (filter === "mentions") return n.type === "mention";
    return n.type === "reminder";
  });

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 md:px-6">
      {/* Header */}
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Notifications</h1>
          <p className="mt-0.5 text-[13px] text-muted-2">Stay updated on what matters to you.</p>
        </div>
        <div className="flex items-center gap-2">
          {live.length > 0 && (
            <button
              onClick={() => live.forEach((n) => dismiss(n.id))}
              className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-[13px] font-semibold text-muted transition-colors hover:text-danger"
            >
              <Trash2 className="size-4" /> Clear all
            </button>
          )}
          {unread > 0 && (
            <button
              onClick={() => setReadIds(new Set(items.map((n) => n.id)))}
              className="inline-flex items-center gap-1.5 rounded-xl border border-primary/40 bg-primary/10 px-3.5 py-2 text-[13px] font-semibold text-primary transition hover:brightness-110"
            >
              <Check className="size-4" /> Mark all as read
            </button>
          )}
        </div>
      </div>

      {/* Enabled types — reflected from the backend prefs, managed in Settings */}
      {prefs && (
        <div className="glass mb-5 flex flex-wrap items-center gap-x-2 gap-y-1.5 rounded-2xl px-4 py-3">
          <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-foreground">
            <BellRing className="size-3.5 text-primary" /> Notifying you about:
          </span>
          {enabled.length > 0 ? (
            enabled.map((l) => (
              <span key={l} className="rounded-full bg-primary/10 px-2 py-0.5 text-[11.5px] font-medium text-primary">
                {l}
              </span>
            ))
          ) : (
            <span className="text-[12px] text-muted-2">All notification types are turned off.</span>
          )}
          <Link
            href="/settings"
            className="ml-auto inline-flex items-center gap-1 text-[12px] font-semibold text-primary hover:underline"
          >
            <Settings className="size-3.5" /> Manage
          </Link>
        </div>
      )}

      {/* Quick-filter tabs */}
      <div className="mb-4 flex items-center gap-6 overflow-x-auto border-b border-border no-scrollbar">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setFilter(t.key)}
            className={cn(
              "-mb-px flex shrink-0 items-center gap-1.5 border-b-2 pb-2.5 text-[14px] font-semibold transition-colors",
              filter === t.key ? "border-primary text-primary" : "border-transparent text-muted hover:text-foreground",
            )}
          >
            {t.label}
            {t.key !== "all" && tabCount(t.key) > 0 && (
              <span className="grid min-w-5 place-items-center rounded-full bg-primary/20 px-1 text-[11px] font-bold text-primary">
                {tabCount(t.key)}
              </span>
            )}
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <div className="panel rounded-2xl p-10 text-center">
          <p className="font-semibold">
            {filter === "unread" ? "You're all caught up" : filter === "all" ? "Nothing here yet" : "Nothing in this filter"}
          </p>
          <p className="mt-1 text-sm text-muted-2">Nothing to show here right now.</p>
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
