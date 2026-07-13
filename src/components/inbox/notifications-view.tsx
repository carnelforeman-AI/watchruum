"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  Trash2,
  Check,
  ChevronRight,
  Mail,
  MessageSquare,
  Heart,
  CalendarClock,
  Clapperboard,
  Unlock,
  Flame,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useDismissed } from "@/lib/use-dismissed";
import { Poster } from "@/components/media/poster";
import { NotifAvatar, NotifText } from "@/components/inbox/notif-visuals";
import { notificationHref } from "@/lib/notif-link";
import type { NotificationItem } from "@/lib/queries";

/**
 * "Notification Type" cards break the feed down by kind and show the live
 * unread count for each type; tapping one filters the list below. On/off
 * control of each type lives in Settings → Notifications (the backend toggles).
 * Watchruum is ad-free, so there's no Offers card.
 */
const CATEGORIES: {
  key: string;
  label: string;
  desc: string;
  icon: React.ComponentType<{ className?: string }>;
  tint: string;
  badge: string;
  types: string[];
}[] = [
  { key: "messages", label: "Direct Messages", desc: "New direct messages from other members.", icon: Mail, tint: "bg-accent/15 text-accent", badge: "bg-accent", types: ["message"] },
  { key: "replies", label: "Replies & Mentions", desc: "Replies and mentions on your posts and reviews.", icon: MessageSquare, tint: "bg-primary/15 text-primary", badge: "bg-primary", types: ["reply", "mention"] },
  { key: "likes", label: "Likes", desc: "Likes and reactions on your reviews and posts.", icon: Heart, tint: "bg-danger/15 text-danger", badge: "bg-danger", types: ["like", "reaction"] },
  { key: "reminders", label: "Watch Reminders", desc: "Upcoming episodes and scheduled watches.", icon: CalendarClock, tint: "bg-accent-2/15 text-accent-2", badge: "bg-accent-2", types: ["reminder"] },
  { key: "releases", label: "New Releases", desc: "New movies and shows you're tracking.", icon: Clapperboard, tint: "bg-season/15 text-season", badge: "bg-season", types: ["release", "episode"] },
  { key: "unlocks", label: "Discussion Unlocks", desc: "When a discussion you follow unlocks.", icon: Unlock, tint: "bg-safe/15 text-safe", badge: "bg-safe", types: ["unlock"] },
  { key: "trending", label: "Trending", desc: "Popular rooms and trending discussions.", icon: Flame, tint: "bg-warn/15 text-warn", badge: "bg-warn", types: ["trending"] },
];

// type -> category key (unmapped types stay visible under "All" but have no card)
const TYPE_TO_CAT: Record<string, string> = {};
for (const c of CATEGORIES) for (const t of c.types) TYPE_TO_CAT[t] = c.key;

type Filter = "all" | "unread" | "mentions" | string;

const TABS: { key: Filter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "unread", label: "Unread" },
  { key: "mentions", label: "Mentions" },
  { key: "reminders", label: "Reminders" },
];

export function NotificationsView({ items }: { items: NotificationItem[] }) {
  const { dismissed, dismiss } = useDismissed("notifications");
  const [readIds, setReadIds] = useState<Set<string>>(() => new Set(items.filter((n) => !n.unread).map((n) => n.id)));
  const [filter, setFilter] = useState<Filter>("all");

  const live = useMemo(() => items.filter((n) => !dismissed.has(n.id)), [items, dismissed]);
  const isRead = (id: string) => readIds.has(id);
  const unread = live.filter((n) => !isRead(n.id)).length;
  const mentions = live.filter((n) => n.type === "mention").length;

  // Live unread count per category (actual numbers, from the same feed as the bell).
  const catUnread = useMemo(() => {
    const m: Record<string, number> = {};
    for (const n of live) if (!isRead(n.id)) { const k = TYPE_TO_CAT[n.type]; if (k) m[k] = (m[k] ?? 0) + 1; }
    return m;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live, readIds]);

  const tabCount = (key: Filter) =>
    key === "unread" ? unread : key === "mentions" ? mentions : key === "all" ? live.length : catUnread[key] ?? 0;

  const shown = live.filter((n) => {
    if (filter === "all") return true;
    if (filter === "unread") return !isRead(n.id);
    if (filter === "mentions") return n.type === "mention";
    return TYPE_TO_CAT[n.type] === filter;
  });

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 md:px-6">
      {/* Header */}
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
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

      {/* Quick-filter tabs */}
      <div className="mb-6 flex items-center gap-6 overflow-x-auto border-b border-border no-scrollbar">
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

      {/* Notification Types — live counts + tap to filter (manage on/off in Settings) */}
      <h2 className="mb-3 text-[15px] font-bold">Notification Types</h2>
      <div className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {CATEGORIES.map((c) => {
          const n = catUnread[c.key] ?? 0;
          const active = filter === c.key;
          return (
            <button
              key={c.key}
              onClick={() => setFilter(active ? "all" : c.key)}
              className={cn(
                "glass flex items-start gap-3 rounded-2xl p-4 text-left transition-colors",
                active ? "ring-1 ring-primary/50" : "hover:bg-white/[0.03]",
              )}
            >
              <span className={cn("grid size-10 shrink-0 place-items-center rounded-xl", c.tint)}>
                <c.icon className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold">{c.label}</p>
                  <span
                    className={cn(
                      "grid min-w-5 place-items-center rounded-full px-1.5 text-[11px] font-bold",
                      n > 0 ? `${c.badge} text-white` : "bg-white/10 text-muted-2",
                    )}
                  >
                    {n}
                  </span>
                </div>
                <p className="mt-1 text-[12px] leading-snug text-muted-2">{c.desc}</p>
              </div>
              <ChevronRight className="mt-2 size-4 shrink-0 text-muted-2" />
            </button>
          );
        })}
      </div>

      {/* Recent / filtered list */}
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-[15px] font-bold">{filter === "all" ? "Recent Notifications" : labelFor(filter)}</h2>
        {filter !== "all" && (
          <button onClick={() => setFilter("all")} className="text-[12px] font-semibold text-primary hover:underline">
            Show all
          </button>
        )}
      </div>

      {shown.length === 0 ? (
        <div className="panel rounded-2xl p-10 text-center">
          <p className="font-semibold">
            {filter === "unread" ? "You're all caught up" : filter === "all" ? "Nothing here yet" : "Nothing in this category"}
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

function labelFor(filter: string): string {
  if (filter === "unread") return "Unread";
  if (filter === "mentions") return "Mentions";
  return CATEGORIES.find((c) => c.key === filter)?.label ?? "Notifications";
}
