"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Bell, BellRing, X, Play, MessageSquare, ExternalLink } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { MessageWindow } from "@/components/friends/message-window";
import { cn, timeAgo } from "@/lib/utils";
import type { ActivityEvent } from "@/lib/types";
import type { FriendOnline } from "@/lib/queries";

const LS_KEY = "wr_friend_alerts";

function readSet(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(LS_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

type Selected =
  | { kind: "online"; key: string; data: FriendOnline }
  | { kind: "activity"; key: string; data: ActivityEvent };

/**
 * Combined Friends panel (Online 65% / Recent Activity 35%). Each row can be
 * toggled for alerts (persisted locally) and clicked to open a detail window.
 */
export function FriendsRailPanel({
  friendsOnline,
  friendActivity,
}: {
  friendsOnline: FriendOnline[];
  friendActivity: ActivityEvent[];
}) {
  const [alerts, setAlerts] = useState<Set<string>>(() => new Set());
  const [selected, setSelected] = useState<Selected | null>(null);
  const [messaging, setMessaging] = useState<FriendOnline | null>(null);

  useEffect(() => {
    // Hydrate from localStorage after mount so SSR and first client render agree.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAlerts(readSet());
  }, []);

  const toggle = useCallback((key: string) => {
    setAlerts((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      try {
        window.localStorage.setItem(LS_KEY, JSON.stringify([...next]));
      } catch {
        /* ignore quota / privacy-mode errors */
      }
      return next;
    });
  }, []);

  return (
    <>
      <Card>
        <div className="flex items-center justify-between p-5 pb-3">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold">Friends Online</h3>
            <Link
              href="/friends"
              aria-label="Add friends"
              title="Add friends"
              className="grid size-6 place-items-center rounded-full border border-primary/40 bg-primary/10 text-primary transition-colors hover:bg-primary/20"
            >
              <Plus className="size-3.5" />
            </Link>
          </div>
          <Link href="/friends" className="text-[12px] font-semibold text-primary hover:underline">
            View all
          </Link>
        </div>

        <div className="flex h-[420px] flex-col px-2 pb-3">
          {/* Friends online — 65% */}
          <div className="min-h-0 flex-[65] overflow-y-auto px-1 no-scrollbar">
            <div className="space-y-1">
              {friendsOnline.map((f, i) => {
                const key = `online:${f.name}`;
                return (
                  <Row key={i} onOpen={() => setSelected({ kind: "online", key, data: f })}>
                    <Avatar name={f.name} src={f.avatar} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-1.5 text-[13px] font-semibold">
                        <span className={cn("size-2 shrink-0 rounded-full", f.status === "online" ? "bg-safe" : "bg-warn")} />
                        <span className="truncate">{f.name}</span>
                      </p>
                      <p className="truncate text-[12px] text-muted-2">In {f.room} Room</p>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setMessaging(f);
                      }}
                      aria-label={`Message ${f.name}`}
                      title={`Message ${f.name}`}
                      className="grid size-7 shrink-0 place-items-center rounded-lg text-muted-2 opacity-60 transition-colors hover:text-primary hover:opacity-100 group-hover:opacity-100"
                    >
                      <MessageSquare className="size-4" />
                    </button>
                  </Row>
                );
              })}
            </div>
          </div>

          {/* Recent activity — 35% */}
          <div className="mt-2 min-h-0 flex-[35] overflow-y-auto border-t border-border px-1 pt-3 no-scrollbar">
            <div className="mb-2 flex items-center justify-between px-1">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-2">Recent Activity</p>
              <Link href="/activity" className="text-[11px] font-semibold text-primary hover:underline">
                View all
              </Link>
            </div>
            <div className="space-y-1">
              {friendActivity.map((a) => {
                const key = `act:${a.id}`;
                return (
                  <Row key={a.id} align="start" onOpen={() => setSelected({ kind: "activity", key, data: a })}>
                    <Avatar name={a.actor.display_name} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] leading-tight">
                        <span className="font-semibold">{a.actor.display_name}</span>{" "}
                        <span className="text-muted">{a.verb}</span>
                        {a.score ? <span className="ml-1 font-semibold text-warn">★ {a.score}/10</span> : null}
                      </p>
                      <p className="truncate text-[12px] text-muted-2">{a.target}</p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <span className="text-[11px] text-muted-2">{timeAgo(a.created_at)}</span>
                      <AlertBell on={alerts.has(key)} onClick={() => toggle(key)} name={a.actor.display_name} compact />
                    </div>
                  </Row>
                );
              })}
            </div>
          </div>
        </div>
      </Card>

      {selected && (
        <DetailModal
          selected={selected}
          alerted={alerts.has(selected.key)}
          onToggle={() => toggle(selected.key)}
          onClose={() => setSelected(null)}
          onMessage={() => {
            if (selected.kind === "online") setMessaging(selected.data);
            setSelected(null);
          }}
        />
      )}

      {messaging && (
        <MessageWindow
          name={messaging.name}
          avatar={messaging.avatar}
          status={messaging.status}
          onClose={() => setMessaging(null)}
        />
      )}
    </>
  );
}

/* ---------------------------------------------------------------- pieces */

function Row({
  children,
  onOpen,
  align = "center",
}: {
  children: React.ReactNode;
  onOpen: () => void;
  align?: "center" | "start";
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
      className={cn(
        "group flex cursor-pointer gap-3 rounded-lg px-2 py-1.5 outline-none transition-colors hover:bg-white/[0.04] focus-visible:bg-white/[0.06]",
        align === "start" ? "items-start" : "items-center",
      )}
    >
      {children}
    </div>
  );
}

function AlertBell({ on, onClick, name, compact = false }: { on: boolean; onClick: () => void; name: string; compact?: boolean }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      aria-pressed={on}
      aria-label={on ? `Alerts on for ${name}` : `Get alerts for ${name}`}
      title={on ? `Alerts on for ${name}` : `Get alerts for ${name}`}
      className={cn(
        "grid shrink-0 place-items-center rounded-lg transition-colors",
        compact ? "size-6" : "size-7",
        on ? "text-primary" : "text-muted-2 opacity-60 hover:text-foreground hover:opacity-100 group-hover:opacity-100",
      )}
    >
      {on ? <BellRing className={compact ? "size-3.5" : "size-4"} /> : <Bell className={compact ? "size-3.5" : "size-4"} />}
    </button>
  );
}

function DetailModal({
  selected,
  alerted,
  onToggle,
  onClose,
  onMessage,
}: {
  selected: Selected;
  alerted: boolean;
  onToggle: () => void;
  onClose: () => void;
  onMessage: () => void;
}) {
  const [noRoom, setNoRoom] = useState(false);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const isOnline = selected.kind === "online";
  const name = isOnline ? selected.data.name : selected.data.actor.display_name;
  const avatar = isOnline ? selected.data.avatar : null;

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="panel relative z-10 w-full max-w-sm overflow-hidden rounded-2xl border border-border shadow-2xl">
        <div className="flex items-start justify-between p-5 pb-3">
          <div className="flex items-center gap-3">
            <Avatar name={name} src={avatar} size="lg" className="size-12" />
            <div>
              <p className="text-[15px] font-extrabold">{name}</p>
              {isOnline ? (
                <p className="flex items-center gap-1.5 text-[12px] text-muted-2">
                  <span className={cn("size-2 rounded-full", selected.data.status === "online" ? "bg-safe" : "bg-warn")} />
                  {selected.data.status === "online" ? "Online" : "Away"} · In {selected.data.room} Room
                </p>
              ) : (
                <p className="text-[12px] text-muted-2">{timeAgo(selected.data.created_at)}</p>
              )}
            </div>
          </div>
          <button onClick={onClose} aria-label="Close" className="grid size-8 place-items-center rounded-lg text-muted-2 hover:bg-white/5 hover:text-foreground">
            <X className="size-4" />
          </button>
        </div>

        <div className="px-5 pb-2">
          {isOnline ? (
            <p className="text-[13.5px] text-muted">
              {name} is currently watching in the <span className="font-semibold text-foreground">{selected.data.room}</span> room. Jump in
              to chat spoiler-safely at their episode.
            </p>
          ) : (
            <p className="text-[13.5px] text-muted">
              <span className="font-semibold text-foreground">{name}</span> {selected.data.verb}{" "}
              {selected.data.score ? <span className="font-semibold text-warn">★ {selected.data.score}/10</span> : null}
              <span className="block text-[13px] text-muted-2">{selected.data.target}</span>
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="space-y-2 p-5 pt-3">
          {isOnline ? (
            <>
              <div className="grid grid-cols-2 gap-2">
                {selected.data.roomHref ? (
                  <Link
                    href={selected.data.roomHref}
                    onClick={onClose}
                    className="flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-primary to-primary-strong px-3 py-2.5 text-[13px] font-bold text-white hover:opacity-90"
                  >
                    <Play className="size-4" /> Join Room
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={() => setNoRoom(true)}
                    className="flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-primary to-primary-strong px-3 py-2.5 text-[13px] font-bold text-white hover:opacity-90"
                  >
                    <Play className="size-4" /> Join Room
                  </button>
                )}
                <button
                  type="button"
                  onClick={onMessage}
                  className="flex items-center justify-center gap-1.5 rounded-xl border border-border bg-white/[0.03] px-3 py-2.5 text-[13px] font-semibold text-foreground hover:bg-white/[0.07]"
                >
                  <MessageSquare className="size-4" /> Message
                </button>
              </div>
              {noRoom && (
                <p className="mt-1 rounded-lg bg-warn/10 px-3 py-2 text-center text-[12.5px] font-medium text-warn">
                  {name} is not currently in a room.
                </p>
              )}
            </>
          ) : (
            <Link
              href="/activity"
              onClick={onClose}
              className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-border bg-white/[0.03] px-3 py-2.5 text-[13px] font-semibold text-foreground hover:bg-white/[0.07]"
            >
              <ExternalLink className="size-4" /> View activity
            </Link>
          )}

          <button
            onClick={onToggle}
            className={cn(
              "flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-[13px] font-bold transition-colors",
              alerted ? "bg-primary/15 text-primary ring-1 ring-primary/30" : "border border-border bg-white/[0.03] text-muted hover:text-foreground",
            )}
          >
            {alerted ? <BellRing className="size-4" /> : <Bell className="size-4" />}
            {alerted ? `Alerts on for ${name}` : `Get alerts for ${name}`}
          </button>
        </div>
      </div>
    </div>
  );
}
