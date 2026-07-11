"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { X, ShieldHalf, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";
import { WatchruumLogo } from "./logo";
import { NAV_ITEMS } from "./nav-items";

export function MobileDrawer({
  open,
  onClose,
  profile,
  signedIn,
}: {
  open: boolean;
  onClose: () => void;
  profile?: {
    display_name: string;
    username?: string | null;
    avatar_url: string | null;
    is_admin?: boolean;
    is_moderator?: boolean;
  } | null;
  signedIn?: boolean;
}) {
  const pathname = usePathname();

  // Lock body scroll while the drawer is open.
  useEffect(() => {
    if (open) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [open]);

  return (
    <div className={cn("fixed inset-0 z-50 lg:hidden", open ? "" : "pointer-events-none")} aria-hidden={!open}>
      {/* Scrim */}
      <div
        onClick={onClose}
        className={cn(
          "absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity",
          open ? "opacity-100" : "opacity-0",
        )}
      />

      {/* Panel */}
      <aside
        className={cn(
          "absolute inset-y-0 left-0 flex w-[280px] max-w-[85%] flex-col border-r border-border-soft bg-bg-elevated transition-transform duration-300",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center justify-between px-5 py-5">
          <WatchruumLogo />
          <button
            onClick={onClose}
            aria-label="Close menu"
            className="grid size-9 place-items-center rounded-lg text-muted hover:bg-white/5 hover:text-foreground"
          >
            <X className="size-5" />
          </button>
        </div>

        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 no-scrollbar">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary/15 text-foreground ring-1 ring-primary/30"
                    : "text-muted hover:bg-white/5 hover:text-foreground",
                )}
              >
                <Icon className="size-[18px]" />
                {label}
              </Link>
            );
          })}

          {(profile?.is_moderator || profile?.is_admin) && (
            <Link
              href="/mod"
              onClick={onClose}
              className="mt-2 flex items-center justify-center gap-2 rounded-xl border border-primary/30 bg-primary/10 px-3 py-2.5 text-[13px] font-semibold text-primary"
            >
              <ShieldHalf className="size-4" /> Switch to Moderator View
            </Link>
          )}
          {profile?.is_admin && (
            <Link
              href="/admin"
              onClick={onClose}
              className="mt-1 flex items-center justify-center gap-2 rounded-xl border border-danger/30 bg-danger/10 px-3 py-2.5 text-[13px] font-semibold text-danger"
            >
              <ShieldAlert className="size-4" /> Switch to Admin View
            </Link>
          )}
        </nav>

        <div className="border-t border-border-soft p-3">
          <Link
            href={signedIn ? "/profile" : "/login"}
            onClick={onClose}
            className="flex items-center gap-3 rounded-xl border border-border-soft bg-white/[0.03] p-2.5 hover:bg-white/5"
          >
            <Avatar name={profile?.display_name ?? "Guest"} src={profile?.avatar_url ?? null} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{profile?.display_name ?? "Guest"}</p>
              <p className="text-[11px] text-primary">{signedIn ? "View Profile" : "Sign in"}</p>
            </div>
          </Link>
        </div>
      </aside>
    </div>
  );
}
