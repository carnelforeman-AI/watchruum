"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Search, Bell, Mail } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { ProfileMenu } from "./profile-menu";
import { WatchruumLogo } from "./logo";
import { CURRENT_USER } from "@/lib/mock-data";

export function TopBar({
  profile = null,
  signedIn = false,
}: {
  profile?: { display_name: string; username?: string | null; avatar_url: string | null; is_admin?: boolean } | null;
  signedIn?: boolean;
}) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const displayName = profile?.display_name ?? CURRENT_USER.display_name;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (q.trim()) router.push(`/explore?q=${encodeURIComponent(q.trim())}`);
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border-soft bg-bg/80 px-4 backdrop-blur-xl md:px-6">
      <div className="lg:hidden">
        <WatchruumLogo compact />
      </div>

      <form onSubmit={submit} className="relative mx-auto flex w-full max-w-2xl items-center">
        <Search className="pointer-events-none absolute left-3.5 size-4 text-muted-2" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search for shows, movies, episodes…"
          className="h-10 w-full rounded-xl border border-border bg-white/5 pl-10 pr-16 text-sm placeholder:text-muted-2 focus-visible:border-primary/60 focus-visible:outline-none"
        />
        <kbd className="absolute right-3 hidden rounded-md border border-border bg-white/5 px-1.5 py-0.5 text-[10px] font-medium text-muted-2 sm:block">
          Ctrl K
        </kbd>
      </form>

      <div className="flex items-center gap-1">
        <IconBtn label="Notifications" dot>
          <Bell className="size-[18px]" />
        </IconBtn>
        <IconBtn label="Messages">
          <Mail className="size-[18px]" />
        </IconBtn>
        <div className="ml-1">
          <ProfileMenu
            signedIn={signedIn}
            profile={profile}
            placement="down-right"
            triggerClassName="grid place-items-center rounded-full ring-2 ring-transparent transition hover:ring-primary/40"
          >
            <Avatar name={displayName} src={profile?.avatar_url} size="sm" />
          </ProfileMenu>
        </div>
      </div>
    </header>
  );
}

function IconBtn({
  children,
  label,
  dot,
}: {
  children: React.ReactNode;
  label: string;
  dot?: boolean;
}) {
  return (
    <button
      aria-label={label}
      className="relative grid size-10 place-items-center rounded-xl text-muted transition-colors hover:bg-white/5 hover:text-foreground"
    >
      {children}
      {dot && <span className="absolute right-2.5 top-2.5 size-2 rounded-full bg-primary ring-2 ring-bg" />}
    </button>
  );
}
