"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  TrendingUp,
  Users,
  LayoutGrid,
  CalendarDays,
  CalendarClock,
  Bookmark,
  Activity,
  User,
  PlayCircle,
  ChevronRight,
  ShieldAlert,
  ShieldHalf,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Poster } from "@/components/media/poster";
import { Progress } from "@/components/ui/progress";
import { Avatar } from "@/components/ui/avatar";
import { ProfileMenu } from "./profile-menu";
import { CURRENT_USER } from "@/lib/mock-data";
import { WatchruumLogo } from "./logo";
import type { LibraryItem } from "@/lib/queries";
import type { MediaItem } from "@/lib/types";

const NAV = [
  { href: "/", label: "Home", icon: Home },
  { href: "/trending", label: "Trending", icon: TrendingUp },
  { href: "/rooms", label: "Watch Rooms", icon: Users },
  { href: "/genres", label: "Genres", icon: LayoutGrid },
  { href: "/calendar", label: "Release Calendar", icon: CalendarDays },
  { href: "/schedule", label: "My Schedule", icon: CalendarClock },
  { href: "/watchlist", label: "Watchlist", icon: Bookmark },
  { href: "/activity", label: "Activity", icon: Activity },
  { href: "/profile", label: "Profile", icon: User },
];

export function Sidebar({
  signedIn = false,
  profile = null,
  continueWatching = [],
  watchlist = [],
}: {
  signedIn?: boolean;
  profile?: {
    display_name: string;
    username?: string | null;
    avatar_url: string | null;
    is_admin?: boolean;
    is_moderator?: boolean;
    is_tester?: boolean;
  } | null;
  continueWatching?: LibraryItem[];
  watchlist?: MediaItem[];
}) {
  const pathname = usePathname();

  // The layout supplies real data when signed in, sample TMDb data otherwise.
  const cw = continueWatching;
  const wl = watchlist;
  const displayName = profile?.display_name ?? CURRENT_USER.display_name;

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
          {cw.length === 0 ? (
            <EmptyHint text="Mark an episode watched to see it here." />
          ) : (
            cw.slice(0, 4).map((c) => (
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
            ))
          )}
          {cw.length > 0 && <ViewAll href="/watchlist" />}
        </LibrarySection>

        <LibrarySection title="Your Watchlist" icon={<Bookmark className="size-3.5" />}>
          {wl.length === 0 ? (
            <EmptyHint text="Add shows from Trending to build your list." />
          ) : (
            wl.slice(0, 5).map((m) => (
              <Link
                key={m.id}
                href={`/title/${m.id}`}
                className="flex items-center gap-3 rounded-lg p-2 hover:bg-white/5"
              >
                <Poster
                  title={m.title}
                  src={m.poster_url}
                  genres={m.genres}
                  showTitle={false}
                  rounded="rounded-md"
                  className="h-9 w-7 shrink-0 ring-1 ring-white/10"
                />
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-semibold">{m.title}</p>
                  <p className="text-[11px] text-muted-2">
                    {m.media_type === "tv" ? "Show" : "Movie"}
                    {m.release_year ? ` · ${m.release_year}` : ""}
                  </p>
                </div>
              </Link>
            ))
          )}
          {wl.length > 0 && <ViewAll href="/watchlist" />}
        </LibrarySection>
      </div>

      {(profile?.is_moderator || profile?.is_admin) && (
        <Link
          href="/mod"
          className="mx-3 mt-3 flex items-center justify-center gap-2 rounded-xl border border-primary/30 bg-primary/10 px-3 py-2.5 text-[13px] font-semibold text-primary transition-colors hover:bg-primary/20"
        >
          <ShieldHalf className="size-4" /> Switch to Moderator View
        </Link>
      )}

      {profile?.is_admin && (
        <Link
          href="/admin"
          className="mx-3 mt-2 flex items-center justify-center gap-2 rounded-xl border border-danger/30 bg-danger/10 px-3 py-2.5 text-[13px] font-semibold text-danger transition-colors hover:bg-danger/20"
        >
          <ShieldAlert className="size-4" /> Switch to Admin View
        </Link>
      )}

      <div className="m-3">
        <ProfileMenu
          signedIn={signedIn}
          profile={profile}
          placement="up-left"
          triggerClassName="flex w-full items-center gap-3 rounded-xl border border-border-soft bg-white/[0.03] p-2.5 text-left hover:bg-white/5"
        >
          <Avatar name={displayName} src={profile?.avatar_url} />
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1.5 truncate text-sm font-semibold">
              <span className="truncate">{displayName}</span>
              {profile?.is_tester && (
                <span className="shrink-0 rounded bg-accent/20 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-accent">
                  Beta
                </span>
              )}
            </p>
            <p className="text-[11px] text-primary">{signedIn ? "View Profile" : "Sign in"}</p>
          </div>
          <ChevronRight className="size-4 text-muted-2" />
        </ProfileMenu>
      </div>
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

function EmptyHint({ text }: { text: string }) {
  return <p className="px-2 py-1.5 text-[11px] leading-relaxed text-muted-2">{text}</p>;
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
