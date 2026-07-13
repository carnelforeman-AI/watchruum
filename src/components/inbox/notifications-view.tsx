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

// Group the many notification types into human-friendly categories so users can
// manage them by kind. Any type not listed here falls into "System".
const CATEGORIES: { key: string; label: string; types: string[] }[] = [
  { key: "replies", label: "Replies", types: ["reply"] },
  { key: "mentions", label: "Mentions", types: ["mention"] },
  { key: "likes", label: "Likes", types: ["like", "reaction"] },
  { key: "follows", label: "Follows", types: ["follow", "friend"] },
  { key: "messages", label: "Messages", types: ["message"] },
  { key: "invites", label: "Invites", types: ["invite"] },
  { key: "reminders", label: "Reminders", types: ["reminder"] },
  { key: "releases", label: "Releases", types: ["release", "episode"] },
  { key: "unlocks", label: "Unlocks", types: ["unlock"] },
  { key: "trending", label: "Trending", types: ["trending"] },
  { key: "polls", label: "Polls", types: ["poll"] },
];
const TYPE_TO_CAT: Record<string, string> = {};
for (const c of CATEGORIES) for (const t of c.types) TYPE_TO_CAT[t] = c.key;
const catOf = (type: string) => TYPE_TO_CAT[type] ?? "system";

type Filter = "all" | "unread" | string;

export function NotificationsView({ items }: { items: NotificationItem[] }) {
  const { dismissed, dismiss } = useDismissed("notifications");
  const [readIds, setReadIds] = useState<Set<string>>(() => new Set(items.filter((n) => !n.unread).map((n) => n.id)));
  const [filter, setFilter] = useState<Filter>("all");

  const live = useMemo(() => items.filter((n) => !dismissed.has(n.id)), [items, dismissed]);
  const isRead = (id: string) => readIds.has(id);
  const unread = live.filter((n) => !isRead(n.id)).length;

  // Per-category counts, so we only surface chips that actually have items.
  const catCounts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const n of live) {
      const k = catOf(n.type);
      m[k] = (m[k] ?? 0) + 1;
    }
    return m;
  }, [live]);

  // The chip row: All + Unread, then each non-empty category in order, System last.
  const chips = useMemo(() => {
    const out: { key: Filter; label: string; count: number }[] = [
      { key: "all", label: "All", count: live.length },
      { key: "unread", label: "Unread", count: unread },
    ];
    for (const c of CATEGORIES) if (catCounts[c.key]) out.push({ key: c.key, label: c.label, count: catCounts[c.key] });
    if (catCounts["system"]) out.push({ key: "system", label: "System", count: catCounts["system"] });
    return out;
  }, [live.length, unread, catCounts]);

  const shown = live.filter((n) => {
    if (filter === "all") return true;
    if (filter === "unread") return !isRead(n.id);
    return catOf(n.type) === filter;
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

      {/* Category filter chips — break notifications down by type */}
      <div className="no-scrollbar mb-4 flex items-center gap-2 overflow-x-auto pb-1">
        {chips.map((c) => (
          <button
            key={c.key}
            onClick={() => setFilter(c.key)}
            className={cn(
              "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] font-semibold transition-colors",
              filter === c.key
                ? "border-primary/50 bg-primary/15 text-primary"
                : "border-border bg-white/[0.03] text-muted hover:text-foreground",
            )}
          >
            {c.label}
            <span
              className={cn(
                "grid min-w-5 place-items-center rounded-full px-1 text-[11px] font-bold",
                filter === c.key ? "bg-primary/25 text-primary" : "bg-white/10 text-foreground",
              )}
            >
              {c.count}
            </span>
          </button>
        ))}
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
