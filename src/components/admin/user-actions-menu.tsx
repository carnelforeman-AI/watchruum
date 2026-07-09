"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  MoreHorizontal,
  RotateCcw,
  User,
  Info,
  Activity,
  Flag,
  StickyNote,
  MessageSquare,
  Shield,
  AlertTriangle,
  MinusCircle,
  VolumeX,
  PauseCircle,
  Ban,
  LogOut,
  Trash2,
  Loader2,
} from "lucide-react";
import { changeRole, setUserStatus, addAdminNote, warnUser } from "@/app/admin-actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type ActionResult = { ok: boolean; error?: string };

type ModalState = {
  mode: "confirm" | "text" | "info";
  title: string;
  message?: string;
  confirmLabel?: string;
  requireText?: boolean;
  textLabel?: string;
  destructive?: boolean;
  run: (text: string) => Promise<ActionResult>;
};

export interface UserActionsMenuUser {
  id: string;
  display_name: string;
  username: string | null;
  is_admin: boolean;
  status: string;
}

export function UserActionsMenu({ user }: { user: UserActionsMenuUser }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [modal, setModal] = useState<ModalState | null>(null);

  const closeMenu = () => setOpen(false);
  const openModal = (m: ModalState) => {
    setOpen(false);
    setModal(m);
  };
  const noop = async (): Promise<ActionResult> => ({ ok: true });

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="User actions"
        className="grid size-7 place-items-center rounded-lg text-muted-2 hover:bg-white/5 hover:text-foreground"
      >
        <MoreHorizontal className="size-4" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-20" onClick={closeMenu} />
          <div className="absolute right-0 z-30 mt-1 w-56 rounded-xl border border-border bg-bg-elevated py-1 shadow-xl">
            {user.status !== "active" && (
              <>
                <MenuButton
                  icon={RotateCcw}
                  label="Reactivate account"
                  className="text-safe"
                  onClick={() =>
                    openModal({
                      mode: "confirm",
                      title: "Reactivate account",
                      message: `Restore ${user.display_name}'s account to active status?`,
                      confirmLabel: "Reactivate",
                      run: () => setUserStatus(user.id, "active"),
                    })
                  }
                />
                <Separator />
              </>
            )}

            <GroupLabel>View</GroupLabel>
            <MenuLink icon={User} label="View Profile" href={`/admin/users/${user.id}`} onNavigate={closeMenu} />
            <MenuLink
              icon={Info}
              label="View Admin Details"
              href={`/admin/users/${user.id}#details`}
              onNavigate={closeMenu}
            />
            <MenuLink
              icon={Activity}
              label="View Activity"
              href={`/admin/users/${user.id}#activity`}
              onNavigate={closeMenu}
            />
            <MenuLink
              icon={Flag}
              label="View Reports"
              href={`/admin/users/${user.id}#reports`}
              onNavigate={closeMenu}
            />

            <Separator />
            <GroupLabel>Manage</GroupLabel>
            <MenuButton
              icon={StickyNote}
              label="Add Admin Note"
              onClick={() =>
                openModal({
                  mode: "text",
                  title: "Add Admin Note",
                  message: "This private note is only visible to admins.",
                  confirmLabel: "Save Note",
                  requireText: true,
                  textLabel: "Note",
                  run: (text) => addAdminNote(user.id, text),
                })
              }
            />
            <MenuButton
              icon={MessageSquare}
              label="Send Message"
              onClick={() =>
                openModal({
                  mode: "info",
                  title: "Send Message",
                  message: "Direct messaging is coming soon.",
                  run: noop,
                })
              }
            />
            <MenuButton
              icon={Shield}
              label={user.is_admin ? "Remove Admin" : "Make Admin"}
              onClick={() =>
                openModal({
                  mode: "confirm",
                  title: user.is_admin ? "Remove admin role" : "Make admin",
                  message: user.is_admin
                    ? `Revoke admin privileges from ${user.display_name}?`
                    : `Grant admin privileges to ${user.display_name}?`,
                  confirmLabel: user.is_admin ? "Remove Admin" : "Make Admin",
                  destructive: user.is_admin,
                  run: () => changeRole(user.id, !user.is_admin),
                })
              }
            />

            <Separator />
            <GroupLabel>Moderation</GroupLabel>
            <MenuButton
              icon={AlertTriangle}
              label="Warn User"
              className="text-warn"
              onClick={() =>
                openModal({
                  mode: "text",
                  title: "Warn User",
                  message: `Send a warning to ${user.display_name}.`,
                  confirmLabel: "Send Warning",
                  requireText: true,
                  run: (text) => warnUser(user.id, text),
                })
              }
            />
            <MenuButton
              icon={MinusCircle}
              label="Limit Account"
              className="text-warn"
              onClick={() =>
                openModal({
                  mode: "confirm",
                  title: "Limit account",
                  message: `Restrict ${user.display_name}'s account activity?`,
                  confirmLabel: "Limit Account",
                  destructive: true,
                  run: () => setUserStatus(user.id, "limited"),
                })
              }
            />
            <MenuButton
              icon={VolumeX}
              label="Mute User"
              className="text-warn"
              onClick={() =>
                openModal({
                  mode: "confirm",
                  title: "Mute user",
                  message: `Prevent ${user.display_name} from posting?`,
                  confirmLabel: "Mute User",
                  destructive: true,
                  run: () => setUserStatus(user.id, "muted"),
                })
              }
            />
            <MenuButton
              icon={PauseCircle}
              label="Suspend User"
              className="text-warn"
              onClick={() =>
                openModal({
                  mode: "text",
                  title: "Suspend User",
                  message: `Temporarily suspend ${user.display_name}'s account.`,
                  confirmLabel: "Suspend User",
                  requireText: false,
                  destructive: true,
                  run: (text) => setUserStatus(user.id, "suspended", text || undefined),
                })
              }
            />
            <MenuButton
              icon={Ban}
              label="Ban User"
              className="text-danger"
              onClick={() =>
                openModal({
                  mode: "text",
                  title: "Ban User",
                  message: `Permanently ban ${user.display_name} from Watchruum.`,
                  confirmLabel: "Ban User",
                  requireText: false,
                  destructive: true,
                  run: (text) => setUserStatus(user.id, "banned", text || undefined),
                })
              }
            />

            <Separator />
            <GroupLabel>Danger</GroupLabel>
            <MenuButton
              icon={LogOut}
              label="Force Logout"
              className="text-danger"
              onClick={() =>
                openModal({
                  mode: "info",
                  title: "Force Logout",
                  message:
                    "Force logout must be done from the Supabase dashboard using the admin API — it can't be triggered from the app for security.",
                  run: noop,
                })
              }
            />
            <MenuButton
              icon={Trash2}
              label="Delete Account"
              className="text-danger"
              onClick={() =>
                openModal({
                  mode: "info",
                  title: "Delete Account",
                  message:
                    "Account deletion must be done from the Supabase dashboard using the admin API — it can't be triggered from the app for security.",
                  run: noop,
                })
              }
            />
          </div>
        </>
      )}

      {modal && (
        <ActionModal
          modal={modal}
          onClose={() => setModal(null)}
          onDone={() => {
            setModal(null);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

/* ---------------- Local helpers ---------------- */

type IconType = React.ComponentType<{ className?: string }>;

function Separator() {
  return <div className="my-1 h-px bg-border" />;
}

function GroupLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-3 pt-1.5 pb-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-2">
      {children}
    </p>
  );
}

function MenuButton({
  icon: Icon,
  label,
  onClick,
  className,
}: {
  icon: IconType;
  label: string;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2.5 px-3 py-2 text-left text-[13px] hover:bg-white/5",
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
}: {
  icon: IconType;
  label: string;
  href: string;
  onNavigate: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-[13px] text-foreground hover:bg-white/5"
    >
      <Icon className="size-4" />
      {label}
    </Link>
  );
}

function ActionModal({
  modal,
  onClose,
  onDone,
}: {
  modal: ModalState;
  onClose: () => void;
  onDone: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);

  const submit = (value: string) => {
    setError(null);
    startTransition(async () => {
      const res = await modal.run(value.trim());
      if (res.ok) {
        onDone();
      } else {
        setError(res.error ?? "Something went wrong. Please try again.");
      }
    });
  };

  const textDisabled = pending || (modal.requireText === true && text.trim().length === 0);
  const confirmVariant = modal.destructive ? "danger" : "default";

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={() => {
        if (!pending) onClose();
      }}
    >
      <div className="glass w-full max-w-md rounded-2xl p-5" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-base font-semibold">{modal.title}</h3>

        {modal.mode === "text" ? (
          <>
            {modal.message && <p className="mt-1 text-[13px] text-muted-2">{modal.message}</p>}
            <label className="mt-3 block text-[12px] font-semibold text-muted">
              {modal.textLabel ?? (modal.requireText ? "Reason" : "Reason (optional)")}
            </label>
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              disabled={pending}
              autoFocus
              placeholder="Type here…"
              className="mt-1.5"
            />
          </>
        ) : (
          modal.message && <p className="mt-1.5 text-[13px] text-muted-2">{modal.message}</p>
        )}

        {error && <p className="mt-3 text-[13px] font-medium text-danger">{error}</p>}

        <div className="mt-5 flex justify-end gap-2">
          {modal.mode === "info" ? (
            <Button variant="secondary" size="sm" onClick={onClose}>
              Got it
            </Button>
          ) : (
            <>
              <Button variant="secondary" size="sm" onClick={onClose} disabled={pending}>
                Cancel
              </Button>
              {modal.mode === "confirm" ? (
                <Button
                  variant={confirmVariant}
                  size="sm"
                  onClick={() => submit("")}
                  disabled={pending}
                >
                  {pending && <Loader2 className="size-4 animate-spin" />}
                  {modal.confirmLabel ?? "Confirm"}
                </Button>
              ) : (
                <Button
                  variant={confirmVariant}
                  size="sm"
                  onClick={() => submit(text)}
                  disabled={textDisabled}
                >
                  {pending && <Loader2 className="size-4 animate-spin" />}
                  {modal.confirmLabel ?? "Submit"}
                </Button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
