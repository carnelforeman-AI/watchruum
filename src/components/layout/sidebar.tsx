"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  TrendingUp,
  Users,
  Compass,
  Bookmark,
  Activity,
  User,
  PlayCircle,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Poster } from "@/components/media/poster";
import { Progress } from "@/components/ui/progress";
import { Avatar } from "@/components/ui/avatar";
import { CONTINUE_WATCHING, WATCHLIST, CURRENT_USER } from "@/lib/mock-data";
import { WatchruumLogo } from "./logo";

const NAV = [
  { href: "/", label: "Home", icon: Home },
  { href: "/trending", label: "Trending", icon: TrendingUp },
  { href: "/rooms", label: "Watch Rooms", icon: Users },
  { href: "/explore", label: "Discover", icon: Compass },
  { href: "/watchlist", label: "Watchlist", icon: Bookmark },
  { href: "/activity", label: "Activity", icon: Activity },
  { href: "/profile", label: "Profile", icon: User },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="sticky top-0 hidden h-screen w-[264px] shrink-0 flex-col border-r border-border-soft bg-bg-elevated/60 backdrop-blur-xl lg:flex">
      <div className="px-5 py-5">
        <WatchruumLogo />
      </div>

      <nav className="flex flex-col gap-1 px-3">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
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
      </nav>

      <div className="mt-6 flex-1 overflow-y-auto px-3 no-scrollbar">
        <LibrarySection title="Continue Watching" icon={<PlayCircle className="size-3.5" />}>
          {CONTINUE_WATCHING.map((c) => (
            <Link
              key={c.media.id}
              href={`/title/${c.media.id}`}
              className="group flex items-center gap-3 rounded-lg p-2 hover:bg-white/5"
            >
              <Poster
                title={c.media.title}
                src={c.media.poster_url}
                genres={c.media.genres}
                showTitle={false}
                rounded="rounded-md"
                className="h-11 w-8 shrink-0 ring-1 ring-white/10"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-semibold">{c.media.title}</p>
                <p className="truncate text-[11px] text-muted-2">{c.label}</p>
                <Progress value={c.percent} className="mt-1.5" />
              </div>
            </Link>
          ))}
          <ViewAll href="/watchlist" />
        </LibrarySection>

        <LibrarySection title="Your Watchlist" icon={<Bookmark className="size-3.5" />}>
          {WATCHLIST.map((w) => (
            <Link
              key={w.media.id}
              href={`/title/${w.media.id}`}
              className="flex items-center gap-3 rounded-lg p-2 hover:bg-white/5"
            >
              <Poster
                title={w.media.title}
                src={w.media.poster_url}
                genres={w.media.genres}
                showTitle={false}
                rounded="rounded-md"
                className="h-9 w-7 shrink-0 ring-1 ring-white/10"
              />
              <div className="min-w-0">
                <p className="truncate text-[13px] font-semibold">{w.media.title}</p>
                <p className="text-[11px] text-muted-2">{w.label}</p>
              </div>
            </Link>
          ))}
          <ViewAll href="/watchlist" />
        </LibrarySection>
      </div>

      <Link
        href="/profile"
        className="m-3 flex items-center gap-3 rounded-xl border border-border-soft bg-white/[0.03] p-2.5 hover:bg-white/5"
      >
        <Avatar name={CURRENT_USER.display_name} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{CURRENT_USER.display_name}</p>
          <p className="text-[11px] text-primary">View Profile</p>
        </div>
        <ChevronRight className="size-4 text-muted-2" />
      </Link>
    </aside>
  );
}

function LibrarySection({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-5">
      <p className="mb-1 flex items-center gap-1.5 px-2 text-[11px] font-bold uppercase tracking-widest text-muted-2">
        {icon}
        {title}
      </p>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

function ViewAll({ href }: { href: string }) {
  return (
    <Link
      href={href}
      className="block rounded-lg py-1.5 text-center text-[11px] font-semibold text-muted hover:text-foreground"
    >
      View all
    </Link>
  );
}
