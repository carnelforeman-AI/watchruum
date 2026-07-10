"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Local, persistent dismissal for notifications / inbox messages.
 *
 * The feed is sample data with no backing table yet, so "delete" is tracked
 * client-side: dismissed ids are stored in localStorage (keyed per kind) and
 * broadcast so the bell dropdown, the list pages, and the detail view all stay
 * in sync within a session and across refreshes. Swap this for a DELETE call
 * once the notifications/messages tables exist.
 */

export type DismissKind = "notifications" | "messages";

const KEY = (k: DismissKind) => `wr_dismissed_${k}`;
const EVENT = "wr-dismissed-change";

function read(kind: DismissKind): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(KEY(kind));
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

export function useDismissed(kind: DismissKind) {
  // Start empty so server and first client render agree; hydrate on mount.
  const [dismissed, setDismissed] = useState<Set<string>>(() => new Set());
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setDismissed(read(kind));
    setReady(true);
    const sync = (e: Event) => {
      const detail = (e as CustomEvent).detail as { kind?: DismissKind } | undefined;
      if (!detail || detail.kind === kind) setDismissed(read(kind));
    };
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, [kind]);

  const dismiss = useCallback(
    (id: string) => {
      const next = read(kind);
      next.add(id);
      try {
        window.localStorage.setItem(KEY(kind), JSON.stringify([...next]));
      } catch {
        /* ignore quota / privacy-mode errors */
      }
      setDismissed(new Set(next));
      window.dispatchEvent(new CustomEvent(EVENT, { detail: { kind } }));
    },
    [kind],
  );

  return { dismissed, dismiss, ready };
}
