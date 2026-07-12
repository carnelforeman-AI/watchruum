import Link from "next/link";
import { Search, Bell, ExternalLink } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";

export function AdminTopbar({
  profile,
}: {
  profile: { display_name?: string | null; avatar_url?: string | null } | null;
}) {
  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border bg-bg/80 px-4 backdrop-blur md:px-6">
      <div className="relative hidden max-w-md flex-1 sm:block">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-2" />
        <input
          disabled
          aria-label="Search"
          placeholder="Search users, rooms, content…"
          className="h-9 w-full rounded-xl border border-border bg-white/[0.03] pl-9 pr-3 text-sm text-foreground placeholder:text-muted-2 focus:outline-none"
        />
      </div>

      <div className="ml-auto flex items-center gap-2">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-white/[0.03] px-3 py-2 text-[13px] font-semibold transition-colors hover:bg-white/[0.07]"
        >
          View Site <ExternalLink className="size-3.5" />
        </Link>
        <button aria-label="Notifications" className="relative grid size-9 place-items-center rounded-xl border border-border bg-white/[0.03] text-muted transition-colors hover:text-foreground">
          <Bell className="size-4" />
          <span className="absolute right-2 top-2 size-1.5 rounded-full bg-primary" />
        </button>
        <Avatar name={profile?.display_name ?? "Admin"} src={profile?.avatar_url ?? null} size="sm" />
      </div>
    </header>
  );
}
