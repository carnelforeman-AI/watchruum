"use client";

import { useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  MoreHorizontal,
  Eye,
  Users,
  Star,
  Pin,
  Lock,
  Unlock,
  Archive,
  ArchiveRestore,
  Flag,
  Trash2,
  RotateCcw,
  Loader2,
  X,
} from "lucide-react";
import { setRoomFlags, type RoomFlags } from "@/app/admin-actions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface RoomActionsRoom {
  roomKey: string;
  title: string;
  scope_label: string;
  viewHref: string;
  reported: boolean;
  featured: boolean;
  pinned: boolean;
  locked: boolean;
  archived: boolean;
  hidden: boolean;
}

export function RoomActionsMenu({ room }: { room: RoomActionsRoom }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const close = () => {
    setOpen(false);
    setError(null);
  };

  const apply = (patch: RoomFlags, thenClose = true) => {
    setError(null);
    startTransition(async () => {
      const res = await setRoomFlags(room.roomKey, patch);
      if (res.ok) {
        if (thenClose) {
          setOpen(false);
          setConfirmDelete(false);
        }
        router.refresh();
      } else {
        setError(res.error ?? "Something went wrong.");
      }
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Room actions"
        className="grid size-7 place-items-center rounded-lg text-muted-2 hover:bg-white/5 hover:text-foreground"
      >
        <MoreHorizontal className="size-4" />
      </button>

      {open &&
        createPortal(
          <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 backdrop-blur-sm" onClick={close}>
            <div
              className="glass max-h-[85vh] w-full max-w-xs overflow-y-auto rounded-2xl border border-border shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b border-border bg-bg-elevated px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{room.title}</p>
                  <p className="truncate text-[11px] text-muted-2">{room.scope_label}</p>
                </div>
                <button
                  type="button"
                  onClick={close}
                  aria-label="Close menu"
                  className="grid size-7 shrink-0 place-items-center rounded-lg text-muted-2 hover:bg-white/5 hover:text-foreground"
                >
                  <X className="size-4" />
                </button>
              </div>

              <div className="py-1">
                <GroupLabel>View</GroupLabel>
                <Link
                  href={room.viewHref}
                  onClick={close}
                  className="flex w-full items-center gap-2.5 px-4 py-2 text-left text-[13px] text-foreground hover:bg-white/5"
                >
                  <Eye className="size-4" /> View Room
                </Link>
                <MenuLink icon={Users} label="View Members" href={`${room.viewHref}#members`} onNavigate={close} />
                {room.reported && (
                  <MenuLink icon={Flag} label="View Reports" href="/admin/reports" onNavigate={close} className="text-warn" />
                )}

                {room.hidden ? (
                  <>
                    <Separator />
                    <GroupLabel>Removed</GroupLabel>
                    <MenuButton
                      icon={RotateCcw}
                      label="Restore Room"
                      className="text-safe"
                      pending={pending}
                      onClick={() => apply({ hidden: false })}
                    />
                  </>
                ) : (
                  <>
                    <Separator />
                    <GroupLabel>Manage</GroupLabel>
                    <MenuButton
                      icon={Star}
                      label={room.featured ? "Unfeature Room" : "Feature Room"}
                      className={room.featured ? "text-accent" : undefined}
                      pending={pending}
                      onClick={() => apply({ featured: !room.featured })}
                    />
                    <MenuButton
                      icon={Pin}
                      label={room.pinned ? "Unpin Room" : "Pin Room"}
                      className={room.pinned ? "text-primary" : undefined}
                      pending={pending}
                      onClick={() => apply({ pinned: !room.pinned })}
                    />
                    <MenuButton
                      icon={room.locked ? Unlock : Lock}
                      label={room.locked ? "Unlock Room" : "Lock Room"}
                      className="text-warn"
                      pending={pending}
                      onClick={() => apply({ locked: !room.locked })}
                    />
                    <MenuButton
                      icon={room.archived ? ArchiveRestore : Archive}
                      label={room.archived ? "Unarchive Room" : "Archive Room"}
                      className="text-warn"
                      pending={pending}
                      onClick={() => apply({ archived: !room.archived })}
                    />

                    <Separator />
                    <GroupLabel>Danger</GroupLabel>
                    <MenuButton
                      icon={Trash2}
                      label="Delete Room"
                      className="text-danger"
                      pending={pending}
                      onClick={() => {
                        setOpen(false);
                        setConfirmDelete(true);
                      }}
                    />
                  </>
                )}

                {error && <p className="px-4 py-2 text-[12px] font-medium text-danger">{error}</p>}
              </div>
            </div>
          </div>,
          document.body,
        )}

      {confirmDelete &&
        createPortal(
          <div
            className="fixed inset-0 z-[60] grid place-items-center bg-black/60 p-4 backdrop-blur-sm"
            onClick={() => !pending && setConfirmDelete(false)}
          >
            <div className="glass w-full max-w-md rounded-2xl p-5" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-base font-semibold">Delete room</h3>
              <p className="mt-1.5 text-[13px] text-muted-2">
                Remove <span className="font-semibold text-foreground">{room.title}</span>
                {room.scope_label !== "Movie" && room.scope_label !== "Show" ? ` · ${room.scope_label}` : ""} from
                Watchruum. It moves to the Archived tab and can be restored anytime.
              </p>
              {error && <p className="mt-3 text-[13px] font-medium text-danger">{error}</p>}
              <div className="mt-5 flex justify-end gap-2">
                <Button variant="secondary" size="sm" onClick={() => setConfirmDelete(false)} disabled={pending}>
                  Cancel
                </Button>
                <Button variant="danger" size="sm" onClick={() => apply({ hidden: true })} disabled={pending}>
                  {pending && <Loader2 className="size-4 animate-spin" />}
                  Delete Room
                </Button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}

type IconType = React.ComponentType<{ className?: string }>;

function Separator() {
  return <div className="my-1 h-px bg-border" />;
}

function GroupLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-4 pt-1.5 pb-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-2">{children}</p>
  );
}

function MenuButton({
  icon: Icon,
  label,
  onClick,
  className,
  pending,
}: {
  icon: IconType;
  label: string;
  onClick: () => void;
  className?: string;
  pending?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      className={cn(
        "flex w-full items-center gap-2.5 px-4 py-2 text-left text-[13px] hover:bg-white/5 disabled:opacity-50",
        className,
      )}
    >
      <Icon className="size-4" />
      {label}
    </button>
  );
}

function MenuLink({
  icon: Icon,
  label,
  href,
  onNavigate,
  className,
}: {
  icon: IconType;
  label: string;
  href: string;
  onNavigate: () => void;
  className?: string;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={cn(
        "flex w-full items-center gap-2.5 px-4 py-2 text-left text-[13px] text-foreground hover:bg-white/5",
        className,
      )}
    >
      <Icon className="size-4" />
      {label}
    </Link>
  );
}
