import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowUpRight,
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
import { getNotification, type NotificationType } from "@/lib/queries";

export const dynamic = "force-dynamic";

const ICONS: Record<NotificationType, React.ComponentType<{ className?: string }>> = {
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

const LABELS: Record<NotificationType, string> = {
  reply: "New reply",
  like: "New like",
  mention: "You were mentioned",
  follow: "New follower",
  invite: "Room invite",
  pinned: "Pinned update",
  episode: "New episode room",
  hidden: "Spoiler protection",
  reaction: "New reaction",
  report: "Report reviewed",
  warning: "Moderator notice",
  trending: "Trending",
  friend: "Friend activity",
  poll: "Poll results",
};

function ctaLabel(type: NotificationType): string {
  if (type === "follow") return "View profile";
  if (type === "invite") return "Open room";
  if (type === "poll") return "See results";
  return "Open";
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const n = await getNotification(id);
  return { title: n ? `${LABELS[n.type]} · Watchruum` : "Notification · Watchruum" };
}

export default async function NotificationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const n = await getNotification(id);
  if (!n) notFound();

  const Icon = ICONS[n.type] ?? MessageCircle;
  const hasLink = n.href && n.href !== "/notifications";

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 md:px-6">
      <Link
        href="/notifications"
        className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-semibold text-muted transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Back to notifications
      </Link>

      <div className="panel overflow-hidden rounded-2xl">
        <div className="flex items-start gap-4 p-6">
          <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-primary/15 text-primary ring-1 ring-primary/25">
            <Icon className="size-6" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[12px] font-semibold uppercase tracking-widest text-muted-2">{LABELS[n.type]}</p>
            <h1 className="mt-1 text-lg font-bold leading-snug">{n.text}</h1>
            <p className="mt-2 text-[12px] text-muted-2">{n.time}</p>
          </div>
        </div>

        {hasLink && (
          <div className="border-t border-border p-4">
            <Link
              href={n.href}
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-primary-strong"
            >
              {ctaLabel(n.type)} <ArrowUpRight className="size-4" />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
