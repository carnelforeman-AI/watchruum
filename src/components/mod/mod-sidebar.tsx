"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Flag,
  Activity,
  ListChecks,
  Clapperboard,
  Users,
  UserPlus,
  ShieldCheck,
  UserX,
  AlertTriangle,
  Bot,
  Filter,
  Megaphone,
  ScrollText,
  Settings,
  BookOpen,
  ArrowLeftRight,
  ShieldHalf,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";

type Item = { label: string; href: string; icon: React.ComponentType<{ className?: string }>; badge?: number };

export function ModSidebar({
  profile,
  badges,
}: {
  profile: { display_name?: string | null; avatar_url?: string | null; role: string } | null;
  badges: { reports: number; queue: number };
}) {
  const pathname = usePathname();
  const isActive = (href: string) => (href === "/mod" ? pathname === "/mod" : pathname === href);

  const GROUPS: { title: string; items: Item[] }[] = [
    {
      title: "Overview",
      items: [
        { label: "Dashboard", href: "/mod", icon: LayoutDashboard },
        { label: "Reports", href: "/mod/reports", icon: Flag, badge: badges.reports },
        { label: "Room Activity", href: "/mod/room-activity", icon: Activity },
        { label: "Moderation Queue", href: "/mod/queue", icon: ListChecks, badge: badges.queue },
      ],
    },
    {
      title: "Community",
      items: [
        { label: "Watch Rooms", href: "/mod/rooms", icon: Clapperboard },
        { label: "Users", href: "/mod/users", icon: Users },
        { label: "Followers", href: "/mod/followers", icon: UserPlus },
      ],
    },
    {
      title: "Moderation Tools",
      items: [
        { label: "Spoiler Protection", href: "/mod/spoiler-protection", icon: ShieldCheck },
        { label: "Banned Users", href: "/mod/banned", icon: UserX },
        { label: "Warnings", href: "/mod/warnings", icon: AlertTriangle },
        { label: "Automod Rules", href: "/mod/automod", icon: Bot },
        { label: "Keyword Filters", href: "/mod/keyword-filters", icon: Filter },
      ],
    },
    {
      title: "System",
      items: [
        { label: "Announcements", href: "/mod/announcements", icon: Megaphone },
        { label: "Mod Logs", href: "/mod/logs", icon: ScrollText },
        { label: "Settings", href: "/mod/settings", icon: Settings },
      ],
    },
  ];

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-bg-elevated/40 lg:flex">
      <div className="flex h-16 items-center gap-2 px-5">
        <ShieldHalf className="size-5 text-primary" />
        <Link href="/mod" className="text-xl font-extrabold tracking-tight">
          Watch<span className="brand-gradient">ruum</span>
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 pb-4 no-scrollbar">
        {GROUPS.map((group) => (
          <div key={group.title} className="mt-4 first:mt-1">
            <p className="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-2">
              {group.title}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-xl px-3 py-2 text-[13px] font-medium transition-colors",
                      active
                        ? "bg-primary/15 text-foreground ring-1 ring-primary/25"
                        : "text-muted hover:bg-white/5 hover:text-foreground",
                    )}
                  >
                    <Icon className="size-[18px]" />
                    <span className="flex-1">{item.label}</span>
                    {item.badge ? (
                      <span className="grid min-w-5 place-items-center rounded-full bg-danger px-1.5 text-[10px] font-bold text-white">
                        {item.badge}
                      </span>
                    ) : null}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-border p-3">
        <Link
          href="/mod/guide"
          className="mb-2 flex items-center justify-center gap-2 rounded-xl border border-primary/30 bg-primary/10 px-3 py-2.5 text-[13px] font-semibold text-primary transition-colors hover:bg-primary/20"
        >
          <BookOpen className="size-4" /> Moderator Guide
        </Link>
        <Link
          href="/"
          className="mb-2 flex items-center justify-center gap-2 rounded-xl border border-border bg-white/[0.03] px-3 py-2.5 text-[13px] font-semibold text-muted transition-colors hover:bg-white/[0.07] hover:text-foreground"
        >
          <ArrowLeftRight className="size-4" /> Switch to User View
        </Link>
        <div className="flex items-center gap-2.5 rounded-xl px-2 py-1.5">
          <Avatar name={profile?.display_name ?? "Moderator"} src={profile?.avatar_url ?? null} size="sm" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{profile?.display_name ?? "Moderator"}</p>
            <p className="flex items-center gap-1 truncate text-[11px] text-primary">
              <ShieldHalf className="size-3" /> {profile?.role ?? "Moderator"}
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
