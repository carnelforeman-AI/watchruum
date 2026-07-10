"use client";

import { createContext, useCallback, useContext, useMemo, useState, useTransition } from "react";
import { Bell, BellRing, Bookmark, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { toggleTitleAlert } from "@/app/calendar-actions";
import { toggleWatchlist } from "@/app/actions";
import type { MediaItem } from "@/lib/types";

export interface AlertEntry {
  tmdbId: number;
  mediaType: "movie" | "tv";
  title: string;
  poster: string | null;
  releaseDate: string | null;
}

export function alertKey(mediaType: string, tmdbId: number) {
  return `${mediaType}_${tmdbId}`;
}

interface AlertsCtx {
  alerts: Map<string, AlertEntry>;
  interest: Record<string, number>;
  isAlerted: (mediaType: string, tmdbId: number) => boolean;
  toggle: (e: AlertEntry) => void;
  fans: (mediaType: string, tmdbId: number, base: number) => number;
  watchlist: Set<string>;
  toggleWatch: (m: MediaItem) => void;
}

const Ctx = createContext<AlertsCtx | null>(null);

export function AlertsProvider({
  initialAlerts,
  interest,
  children,
}: {
  initialAlerts: AlertEntry[];
  interest: Record<string, number>;
  children: React.ReactNode;
}) {
  const [alerts, setAlerts] = useState<Map<string, AlertEntry>>(
    () => new Map(initialAlerts.map((a) => [alertKey(a.mediaType, a.tmdbId), a])),
  );
  const [watchlist, setWatchlist] = useState<Set<string>>(new Set());
  const [, startTransition] = useTransition();

  const isAlerted = useCallback((mt: string, id: number) => alerts.has(alertKey(mt, id)), [alerts]);

  const toggle = useCallback((e: AlertEntry) => {
    const key = alertKey(e.mediaType, e.tmdbId);
    setAlerts((prev) => {
      const next = new Map(prev);
      const on = !next.has(key);
      if (on) next.set(key, e);
      else next.delete(key);
      startTransition(() => {
        void toggleTitleAlert(
          { tmdbId: e.tmdbId, mediaType: e.mediaType, title: e.title, poster: e.poster, releaseDate: e.releaseDate },
          on,
        );
      });
      return next;
    });
  }, []);

  const fans = useCallback(
    (mt: string, id: number, base: number) => {
      const key = alertKey(mt, id);
      const real = interest[key] ?? 0;
      const mine = alerts.has(key) ? 1 : 0;
      return base + real + mine;
    },
    [alerts, interest],
  );

  const toggleWatch = useCallback((m: MediaItem) => {
    const key = m.id;
    setWatchlist((prev) => {
      const next = new Set(prev);
      const on = !next.has(key);
      if (on) next.add(key);
      else next.delete(key);
      startTransition(() => void toggleWatchlist(m, on));
      return next;
    });
  }, []);

  const value = useMemo<AlertsCtx>(
    () => ({ alerts, interest, isAlerted, toggle, fans, watchlist, toggleWatch }),
    [alerts, interest, isAlerted, toggle, fans, watchlist, toggleWatch],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAlerts() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAlerts must be used within AlertsProvider");
  return ctx;
}

export function formatFans(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}K`;
  return String(n);
}

/* ------------------------------------------------------------- buttons */

export function NotifyButton({ entry, className }: { entry: AlertEntry; className?: string }) {
  const { isAlerted, toggle } = useAlerts();
  const on = isAlerted(entry.mediaType, entry.tmdbId);
  return (
    <button
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggle(entry);
      }}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-[12px] font-semibold transition-colors",
        on
          ? "bg-primary/20 text-primary ring-1 ring-primary/40"
          : "bg-primary text-white hover:bg-primary-strong",
        className,
      )}
    >
      {on ? <BellRing className="size-3.5" /> : <Bell className="size-3.5" />}
      {on ? "Notifying" : "Notify Me"}
    </button>
  );
}

export function WatchlistButton({ media, className }: { media: MediaItem; className?: string }) {
  const { watchlist, toggleWatch } = useAlerts();
  const on = watchlist.has(media.id);
  return (
    <button
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleWatch(media);
      }}
      aria-label="Add to watchlist"
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-[12px] font-semibold transition-colors",
        on
          ? "border-safe/40 bg-safe/15 text-safe"
          : "border-border bg-white/5 text-muted hover:text-foreground",
        className,
      )}
    >
      {on ? <Check className="size-3.5" /> : <Bookmark className="size-3.5" />}
      {on ? "On list" : "Watchlist"}
    </button>
  );
}
