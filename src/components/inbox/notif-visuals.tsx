import {
  MessageCircle,
  Heart,
  AtSign,
  UserPlus,
  Users,
  Pin,
  Play,
  EyeOff,
  Smile,
  Flag,
  ShieldAlert,
  TrendingUp,
  Star,
  BarChart3,
  CalendarClock,
} from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import type { NotificationItem, NotificationType } from "@/lib/queries";

/** Per-type badge: icon + solid badge color (avatar overlay) + soft tile color (system). */
export const NOTIF_BADGE: Record<
  NotificationType,
  { Icon: React.ComponentType<{ className?: string }>; badge: string; tile: string }
> = {
  reply: { Icon: MessageCircle, badge: "bg-primary", tile: "bg-primary/15 text-primary" },
  like: { Icon: Heart, badge: "bg-danger", tile: "bg-danger/15 text-danger" },
  mention: { Icon: AtSign, badge: "bg-accent", tile: "bg-accent/15 text-accent" },
  follow: { Icon: UserPlus, badge: "bg-accent", tile: "bg-accent/15 text-accent" },
  invite: { Icon: Users, badge: "bg-warn", tile: "bg-warn/15 text-warn" },
  pinned: { Icon: Pin, badge: "bg-primary", tile: "bg-primary/15 text-primary" },
  episode: { Icon: Play, badge: "bg-safe", tile: "bg-safe/15 text-safe" },
  hidden: { Icon: EyeOff, badge: "bg-warn", tile: "bg-warn/15 text-warn" },
  reaction: { Icon: Smile, badge: "bg-accent", tile: "bg-accent/15 text-accent" },
  report: { Icon: Flag, badge: "bg-primary", tile: "bg-primary/15 text-primary" },
  warning: { Icon: ShieldAlert, badge: "bg-warn", tile: "bg-warn/15 text-warn" },
  trending: { Icon: TrendingUp, badge: "bg-safe", tile: "bg-safe/15 text-safe" },
  friend: { Icon: Star, badge: "bg-accent", tile: "bg-accent/15 text-accent" },
  poll: { Icon: BarChart3, badge: "bg-primary", tile: "bg-primary/15 text-primary" },
  reminder: { Icon: CalendarClock, badge: "bg-season", tile: "bg-season/15 text-season" },
};

/** Avatar + type badge for social notifications; a colored icon tile for system ones. */
export function NotifAvatar({ n }: { n: NotificationItem }) {
  const { Icon, badge, tile } = NOTIF_BADGE[n.type];
  if (n.actor) {
    return (
      <div className="relative shrink-0">
        <Avatar name={n.actor.name} src={n.actor.avatar} size="lg" />
        <span
          className={cn(
            "absolute -bottom-1 -right-1 grid size-5 place-items-center rounded-full text-white ring-2 ring-panel",
            badge,
          )}
        >
          <Icon className="size-3" />
        </span>
      </div>
    );
  }
  return (
    <span className={cn("grid size-12 shrink-0 place-items-center rounded-full", tile)}>
      <Icon className="size-5" />
    </span>
  );
}

/** Bold actor + action + bold media title, with an optional muted preview line. */
export function NotifText({ n }: { n: NotificationItem }) {
  return (
    <div className="min-w-0 flex-1">
      <p className="text-[13px] leading-snug text-foreground">
        {n.actor ? (
          <>
            <span className="font-semibold">{n.actor.name}</span> {n.action}
          </>
        ) : (
          <span className="font-semibold">{n.action}</span>
        )}
        {n.media && <> <span className="font-semibold">{n.media.title}</span></>}
      </p>
      {n.body && <p className="mt-1 line-clamp-2 text-[12px] leading-snug text-muted">{n.body}</p>}
    </div>
  );
}
