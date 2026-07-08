"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Compass, Users, Bell, User } from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/", label: "Home", icon: Home },
  { href: "/explore", label: "Explore", icon: Compass },
  { href: "/rooms", label: "Rooms", icon: Users },
  { href: "/activity", label: "Alerts", icon: Bell },
  { href: "/profile", label: "Profile", icon: User },
];

export function MobileNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex h-16 items-stretch border-t border-border-soft bg-bg-elevated/90 backdrop-blur-xl lg:hidden">
      {ITEMS.map(({ href, label, icon: Icon }) => {
        const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Link
            key={href}
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
      })}
    </nav>
  );
}
