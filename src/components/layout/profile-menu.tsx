"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { User, Bookmark, Settings, ShieldAlert, LogOut, LogIn, UserPlus } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

export interface ProfileMenuProps {
  signedIn: boolean;
  profile: { display_name: string; username?: string | null; avatar_url: string | null; is_admin?: boolean } | null;
  /** Where the menu opens relative to the trigger. */
  placement: "down-right" | "up-left";
  children: React.ReactNode; // the trigger content
  triggerClassName?: string;
}

export function ProfileMenu({ signedIn, profile, placement, children, triggerClassName }: ProfileMenuProps) {
  const router = useRouter();
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  const displayName = profile?.display_name ?? "You";
  const username = profile?.username ?? null;

  async function signOut() {
    close();
    if (supabase) await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const pos =
    placement === "up-left" ? "bottom-full left-0 mb-2 origin-bottom" : "right-0 top-full mt-2 origin-top-right";

  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen((v) => !v)} className={triggerClassName} aria-haspopup="menu" aria-expanded={open}>
        {children}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={close} />
          <div
            className={cn(
              "panel absolute z-50 w-60 overflow-hidden rounded-2xl border border-border p-1.5 shadow-2xl",
              pos,
            )}
            role="menu"
          >
            <div className="flex items-center gap-2.5 border-b border-border px-2.5 py-2.5">
              <Avatar name={displayName} src={profile?.avatar_url ?? null} size="sm" />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{displayName}</p>
                {signedIn && <p className="truncate text-[11px] text-muted-2">@{username ?? "member"}</p>}
              </div>
            </div>

            <div className="py-1">
              {signedIn ? (
                <>
                  <MenuLink icon={User} label="View Profile" href="/profile" onNavigate={close} />
                  <MenuLink icon={Bookmark} label="Watchlist" href="/watchlist" onNavigate={close} />
                  <MenuLink icon={Settings} label="Settings" href="/settings" onNavigate={close} />
                  {profile?.is_admin && (
                    <MenuLink icon={ShieldAlert} label="Switch to Admin View" href="/admin" onNavigate={close} accent />
                  )}
                  <div className="my-1 h-px bg-border" />
                  <button
                    type="button"
                    onClick={signOut}
                    role="menuitem"
                    className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] font-medium text-danger hover:bg-danger/10"
                  >
                    <LogOut className="size-4" /> Log out
                  </button>
                </>
              ) : (
                <>
                  <MenuLink icon={LogIn} label="Sign in" href="/login" onNavigate={close} />
                  <MenuLink icon={UserPlus} label="Create account" href="/signup" onNavigate={close} />
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function MenuLink({
  icon: Icon,
  label,
  href,
  onNavigate,
  accent,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  href: string;
  onNavigate: () => void;
  accent?: boolean;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      role="menuitem"
      className={cn(
        "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] font-medium hover:bg-white/5",
        accent ? "text-primary" : "text-foreground",
      )}
    >
      <Icon className="size-4" /> {label}
    </Link>
  );
}
