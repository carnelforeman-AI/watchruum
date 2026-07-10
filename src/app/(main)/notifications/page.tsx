import Link from "next/link";
import {
  MessageCircle,
  Heart,
  AtSign,
  UserPlus,
  Ticket,
  Pin,
  Tv,
  EyeOff,
  Smile,
  Flag,
  ShieldAlert,
  TrendingUp,
  Users,
  BarChart3,
} from "lucide-react";
import { getInbox, type NotificationItem } from "@/lib/queries";
import { cn } from "@/lib/utils";

export const metadata = { title: "Notifications · Watchruum" };
export const dynamic = "force-dynamic";

const ICONS: Record<NotificationItem["type"], React.ComponentType<{ className?: string }>> = {
  reply: MessageCircle,
  like: Heart,
  mention: AtSign,
  follow: UserPlus,
  invite: Ticket,
  pinned: Pin,
  episode: Tv,
  hidden: EyeOff,
  reaction: Smile,
  report: Flag,
  warning: ShieldAlert,
  trending: TrendingUp,
  friend: Users,
  poll: BarChart3,
};

export default async function NotificationsPage() {
  const { notifications, unreadNotifications } = await getInbox();

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 md:px-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-extrabold tracking-tight">Notifications</h1>
        {unreadNotifications > 0 && (
          <span className="rounded-full bg-primary/15 px-2.5 py-1 text-[12px] font-semibold text-primary">
            {unreadNotifications} new
          </span>
        )}
      </div>

      <div className="panel divide-y divide-border-soft overflow-hidden rounded-2xl">
        {notifications.map((n, i) => {
          const Icon = ICONS[n.type] ?? MessageCircle;
          return (
            <Link
              key={i}
              href={n.href}
              className={cn(
                "flex items-center gap-3 p-4 transition-colors hover:bg-white/5",
                n.unread && "bg-primary/[0.06]",
              )}
            >
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-white/5 text-primary">
                <Icon className="size-4" />
              </span>
              <p className="flex-1 text-[13px] leading-snug">{n.text}</p>
              <span className="shrink-0 text-[11px] text-muted-2">{n.time}</span>
              {n.unread && <span className="size-2 shrink-0 rounded-full bg-primary" />}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
