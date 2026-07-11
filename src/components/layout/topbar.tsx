"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { Search, Menu, SlidersHorizontal } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { ProfileMenu } from "./profile-menu";
import { NotificationBell, MessageInbox } from "./inbox-menus";
import { WatchruumLogo } from "./logo";
import { MobileDrawer } from "./mobile-drawer";
import { CURRENT_USER } from "@/lib/mock-data";
import type { NotificationItem, MessageItem } from "@/lib/queries";

export function TopBar({
  profile = null,
  signedIn = false,
  notifications = [],
  messages = [],
}: {
  profile?: {
    display_name: string;
    username?: string | null;
    avatar_url: string | null;
    is_admin?: boolean;
    is_moderator?: boolean;
  } | null;
  signedIn?: boolean;
  notifications?: NotificationItem[];
  messages?: MessageItem[];
}) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [drawer, setDrawer] = useState(false);
  const displayName = profile?.display_name ?? CURRENT_USER.display_name;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (q.trim()) router.push(`/explore?q=${encodeURIComponent(q.trim())}`);
  }

  const searchForm = (extraClass: string) => (
    <form onSubmit={submit} className={`relative flex items-center ${extraClass}`}>
      <Search className="pointer-events-none absolute left-3.5 size-4 text-muted-2" />
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search shows, movies, episodes…"
        className="h-10 w-full rounded-xl border border-border bg-white/5 pl-10 pr-16 text-sm placeholder:text-muted-2 focus-visible:border-primary/60 focus-visible:outline-none"
      />
      <kbd className="absolute right-3 hidden rounded-md border border-border bg-white/5 px-1.5 py-0.5 text-[10px] font-medium text-muted-2 sm:block">
        Ctrl K
      </kbd>
    </form>
  );

  const menus = (
    <>
      <NotificationBell notifications={notifications} />
      <MessageInbox messages={messages} />
      <ProfileMenu
        signedIn={signedIn}
        profile={profile}
        placement="down-right"
        triggerClassName="ml-0.5 grid place-items-center rounded-full ring-2 ring-transparent transition hover:ring-primary/40"
      >
        <Avatar name={displayName} src={profile?.avatar_url} size="sm" />
      </ProfileMenu>
    </>
  );

  return (
    <>
      {/* ---------------- Mobile header (two rows) ---------------- */}
      <header className="sticky top-0 z-30 flex flex-col gap-2.5 border-b border-border-soft bg-bg/85 px-4 py-2.5 backdrop-blur-xl lg:hidden">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setDrawer(true)}
            aria-label="Open menu"
            className="grid size-9 shrink-0 place-items-center rounded-lg text-muted hover:bg-white/5 hover:text-foreground"
          >
            <Menu className="size-6" />
          </button>
          <WatchruumLogo compact />
          <div className="ml-auto flex items-center gap-0.5">{menus}</div>
        </div>
        <div className="flex items-center gap-2">
          {searchForm("min-w-0 flex-1")}
          <Link
            href="/explore"
            aria-label="Filters"
            className="grid size-10 shrink-0 place-items-center rounded-xl border border-border bg-white/5 text-muted transition-colors hover:text-foreground"
          >
            <SlidersHorizontal className="size-4" />
          </Link>
        </div>
      </header>

      {/* ---------------- Desktop header (single row) ---------------- */}
      <header className="sticky top-0 z-30 hidden h-16 items-center gap-3 border-b border-border-soft bg-bg/80 px-4 backdrop-blur-xl md:px-6 lg:flex">
        {searchForm("mx-auto w-full max-w-2xl")}
        <div className="flex items-center gap-1">{menus}</div>
      </header>

      <MobileDrawer open={drawer} onClose={() => setDrawer(false)} profile={profile} signedIn={signedIn} />
    </>
  );
}
