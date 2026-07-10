"use client";

import Link from "next/link";
import {
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
  Mail,
  Trash2,
} from "lucide-react";
import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { useDismissed } from "@/lib/use-dismissed";
import type { MessageItem, MessageKind } from "@/lib/queries";

const ICONS: Record<MessageKind, React.ComponentType<{ className?: string }>> = {
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

export function InboxView({ items }: { items: MessageItem[] }) {
  const { dismissed, dismiss } = useDismissed("messages");
  const visible = useMemo(() => items.filter((m) => !dismissed.has(m.id)), [items, dismissed]);
  const unread = visible.filter((m) => m.unread).length;

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 md:px-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-extrabold tracking-tight">Inbox</h1>
          {unread > 0 && (
            <span className="rounded-full bg-primary/15 px-2.5 py-1 text-[12px] font-semibold text-primary">
              {unread} unread
            </span>
          )}
        </div>
        {visible.length > 0 && (
          <button
            onClick={() => visible.forEach((m) => dismiss(m.id))}
            className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-muted transition-colors hover:text-danger"
          >
            <Trash2 className="size-4" /> Clear all
          </button>
        )}
      </div>

      {visible.length === 0 ? (
        <div className="panel rounded-2xl p-10 text-center">
          <p className="font-semibold">Your inbox is empty</p>
          <p className="mt-1 text-sm text-muted-2">No messages right now.</p>
        </div>
      ) : (
        <div className="panel divide-y divide-border-soft overflow-hidden rounded-2xl">
          {visible.map((m) => {
            const Icon = ICONS[m.kind] ?? Mail;
            return (
              <div key={m.id} className={cn("flex items-start pr-2 transition-colors hover:bg-white/5", m.unread && "bg-primary/[0.06]")}>
                <Link href={`/inbox/${m.id}`} className="flex min-w-0 flex-1 items-start gap-3 p-4">
                  <span
                    className={cn(
                      "mt-0.5 grid size-10 shrink-0 place-items-center rounded-xl",
                      m.official ? "bg-primary/15 text-primary" : "bg-white/5 text-foreground",
                    )}
                  >
                    <Icon className="size-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="truncate text-[14px] font-semibold">{m.from}</span>
                      {m.official && (
                        <span className="rounded bg-white/10 px-1.5 py-px text-[10px] font-medium text-muted-2">Official</span>
                      )}
                      <span className="ml-auto shrink-0 text-[11px] text-muted-2">{m.time}</span>
                    </span>
                    <span className="mt-0.5 block text-[13px] font-medium text-foreground/90">{m.subject}</span>
                    <span className="mt-1 line-clamp-1 block text-[13px] leading-relaxed text-muted">{m.preview}</span>
                  </span>
                  {m.unread && <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" />}
                </Link>
                <button
                  aria-label="Delete message"
                  onClick={() => dismiss(m.id)}
                  className="mt-3 grid size-8 shrink-0 place-items-center rounded-lg text-muted-2 transition-colors hover:bg-danger/15 hover:text-danger"
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
