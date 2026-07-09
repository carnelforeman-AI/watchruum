"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Clapperboard,
  Film,
  ListVideo,
  Star,
  Flag,
  UsersRound,
  Mail,
  Megaphone,
  MessageSquare,
  FileText,
  Bell,
  ShieldCheck,
  ShieldAlert,
  UserX,
  CheckSquare,
  Settings,
  KeyRound,
  Plug,
  ScrollText,
  History,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";

type Item = { label: string; href: string; icon: React.ComponentType<{ className?: string }> };

const OVERVIEW: Item = { label: "Overview", href: "/admin", icon: LayoutDashboard };

const GROUPS: { title: string; items: Item[] }[] = [
  {
    title: "Management",
    items: [
      { label: "Users", href: "/admin/users", icon: Users },
      { label: "Watch Rooms", href: "/admin/rooms", icon: Clapperboard },
      { label: "Content", href: "/admin/content", icon: Film },
      { label: "Episodes", href: "/admin/episodes", icon: ListVideo },
      { label: "Reviews", href: "/admin/reviews", icon: Star },
      { label: "Reports", href: "/admin/reports", icon: Flag },
      { label: "Groups", href: "/admin/groups", icon: UsersRound },
      { label: "Invites", href: "/admin/invites", icon: Mail },
    ],
  },
  {
    title: "Communication",
    items: [
      { label: "Announcements", href: "/admin/announcements", icon: Megaphone },
      { label: "Messages", href: "/admin/messages", icon: MessageSquare },
      { label: "Email Templates", href: "/admin/email-templates", icon: FileText },
      { label: "Push Notifications", href: "/admin/push", icon: Bell },
    ],
  },
  {
    title: "Moderation",
    items: [
      { label: "Flags & Reports", href: "/admin/reports", icon: Flag },
      { label: "Spoiler Protection", href: "/admin/spoiler-protection", icon: ShieldCheck },
      { label: "Banned Users", href: "/admin/banned", icon: UserX },
      { label: "Content Approvals", href: "/admin/approvals", icon: CheckSquare },
    ],
  },
  {
    title: "System",
    items: [
      { label: "Settings", href: "/admin/settings", icon: Settings },
      { label: "Roles & Permissions", href: "/admin/roles", icon: KeyRound },
      { label: "API & Integrations", href: "/admin/integrations", icon: Plug },
      { label: "Logs", href: "/admin/logs", icon: ScrollText },
      { label: "Audit Trail", href: "/admin/audit", icon: History },
    ],
  },
];

export function AdminSidebar({
  profile,
}: {
  profile: { display_name?: string | null; avatar_url?: string | null } | null;
}) {
  const pathname = usePathname();
  const isActive = (href: string) => (href === "/admin" ? pathname === "/admin" : pathname === href);

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-bg-elevated/40 lg:flex">
      <div className="flex h-16 items-center px-5">
        <Link href="/admin" className="text-xl font-extrabold tracking-tight">
          Watch<span className="brand-gradient">ruum</span>
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 pb-4">
        <NavLink item={OVERVIEW} active={isActive(OVERVIEW.href)} />

        {GROUPS.map((group) => (
          <div key={group.title} className="mt-5">
            <p className="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-2">
              {group.title}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <NavLink key={item.label + item.href} item={item} active={isActive(item.href)} />
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-border p-3">
        <div className="flex items-center gap-2.5 rounded-xl px-2 py-1.5">
          <Avatar name={profile?.display_name ?? "Admin"} src={profile?.avatar_url ?? null} size="sm" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{profile?.display_name ?? "Admin"}</p>
            <p className="truncate text-[11px] text-muted-2">Administrator</p>
          </div>
        </div>
      </div>
    </aside>
  );
}

function NavLink({ item, active }: { item: Item; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      className={cn(
        "flex items-center gap-3 rounded-xl px-3 py-2 text-[13px] font-medium transition-colors",
        active
          ? "bg-gradient-to-r from-primary/25 to-accent/15 text-foreground ring-1 ring-primary/30"
          : "text-muted hover:bg-white/5 hover:text-foreground",
      )}
    >
      <Icon className="size-4 shrink-0" />
      {item.label}
    </Link>
  );
}
