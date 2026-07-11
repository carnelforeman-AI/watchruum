"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Users, CalendarDays, User, Plus, X, UserPlus, LayoutGrid, Star } from "lucide-react";
import { cn } from "@/lib/utils";

const LEFT = [
  { href: "/", label: "Home", icon: Home },
  { href: "/rooms", label: "Rooms", icon: Users },
];
const RIGHT = [
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/profile", label: "Profile", icon: User },
];
const QUICK = [
  { href: "/rooms", label: "Explore Rooms", icon: Users },
  { href: "/friends", label: "Find Friends", icon: UserPlus },
  { href: "/genres", label: "Browse Genres", icon: LayoutGrid },
  { href: "/trending", label: "Rate a Title", icon: Star },
];

export function MobileNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const active = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <>
      {/* Quick-action sheet */}
      {open && (
        <>
          <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden" onClick={() => setOpen(false)} />
          <div className="fixed inset-x-4 bottom-24 z-50 rounded-2xl border border-border-soft bg-bg-elevated p-2 shadow-2xl lg:hidden">
            {QUICK.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-foreground hover:bg-white/5"
              >
                <span className="grid size-9 place-items-center rounded-lg bg-primary/15 text-primary">
                  <Icon className="size-4" />
                </span>
                {label}
              </Link>
            ))}
          </div>
        </>
      )}

      <nav className="fixed inset-x-0 bottom-0 z-40 flex h-16 items-stretch border-t border-border-soft bg-bg-elevated/90 backdrop-blur-xl lg:hidden">
        {LEFT.map(({ href, label, icon: Icon }) => (
          <NavBtn key={href} href={href} label={label} Icon={Icon} active={active(href)} />
        ))}

        {/* Center FAB */}
        <div className="relative flex w-16 shrink-0 items-center justify-center">
          <button
            onClick={() => setOpen((v) => !v)}
            aria-label="Quick actions"
            className="absolute -top-5 grid size-14 place-items-center rounded-2xl bg-gradient-to-br from-primary to-primary-strong text-white shadow-lg shadow-primary/30 ring-4 ring-bg transition-transform active:scale-95"
          >
            {open ? <X className="size-6" /> : <Plus className="size-6" />}
          </button>
        </div>

        {RIGHT.map(({ href, label, icon: Icon }) => (
          <NavBtn key={href} href={href} label={label} Icon={Icon} active={active(href)} />
        ))}
      </nav>
    </>
  );
}

function NavBtn({
  href,
  label,
  Icon,
  active,
}: {
  href: string;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex flex-1 flex-col items-center justify-center gap-1 text-[10px] font-medium transition-colors",
        active ? "text-primary" : "text-muted-2",
      )}
    >
      <Icon className={cn("size-5", active && "drop-shadow-[0_0_8px_rgba(139,92,246,0.6)]")} />
      {label}
    </Link>
  );
}
