import { Search, Bell, Mail, ShieldHalf } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";

export function ModTopbar({
  profile,
}: {
  profile: { display_name?: string | null; avatar_url?: string | null } | null;
}) {
  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-4 border-b border-border bg-bg/80 px-4 backdrop-blur-xl md:px-8">
      <div className="flex items-center gap-3">
        <span className="grid size-9 place-items-center rounded-xl bg-primary/15 text-primary ring-1 ring-primary/25">
          <ShieldHalf className="size-5" />
        </span>
        <div className="hidden sm:block">
          <p className="text-[15px] font-bold leading-tight">Moderator Dashboard</p>
          <p className="text-[12px] text-muted-2">Keep our community safe and awesome.</p>
        </div>
      </div>

      <div className="relative mx-auto hidden max-w-xl flex-1 md:block">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-2" />
        <input
          disabled
          placeholder="Search users, rooms, content, reports…"
          className="w-full rounded-xl border border-border bg-white/[0.03] py-2.5 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-2 outline-none"
        />
      </div>

      <div className="ml-auto flex items-center gap-2">
        <button className="relative grid size-9 place-items-center rounded-xl text-muted hover:bg-white/5 hover:text-foreground" aria-label="Notifications">
          <Bell className="size-5" />
        </button>
        <button className="relative grid size-9 place-items-center rounded-xl text-muted hover:bg-white/5 hover:text-foreground" aria-label="Messages">
          <Mail className="size-5" />
        </button>
        <Avatar name={profile?.display_name ?? "Moderator"} src={profile?.avatar_url ?? null} size="sm" />
      </div>
    </header>
  );
}
