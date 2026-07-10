import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { getNotification, type NotificationType } from "@/lib/queries";
import { NotifAvatar } from "@/components/inbox/notif-visuals";
import { Poster } from "@/components/media/poster";
import { DetailDeleteButton } from "@/components/inbox/detail-delete-button";

export const dynamic = "force-dynamic";

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
          <NotifAvatar n={n} />
          <div className="min-w-0 flex-1">
            <p className="text-[12px] font-semibold uppercase tracking-widest text-muted-2">{LABELS[n.type]}</p>
            <h1 className="mt-1 text-lg font-bold leading-snug">
              {n.actor ? (
                <>
                  <span>{n.actor.name}</span> <span className="font-normal">{n.action}</span>
                </>
              ) : (
                n.action
              )}
              {n.media && <> <span>{n.media.title}</span></>}
            </h1>
            {n.body && <p className="mt-2 text-[14px] leading-relaxed text-muted">{n.body}</p>}
            <p className="mt-3 text-[12px] text-muted-2">{n.time}</p>
          </div>
          {n.media && (
            <Poster
              title={n.media.title}
              src={n.media.poster}
              genres={n.media.genres}
              showTitle={false}
              rounded="rounded-xl"
              className="hidden size-24 shrink-0 ring-1 ring-white/10 sm:block"
            />
          )}
        </div>

        <div className="flex items-center gap-3 border-t border-border p-4">
          {hasLink && (
            <Link
              href={n.href}
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-primary-strong"
            >
              {ctaLabel(n.type)} <ArrowUpRight className="size-4" />
            </Link>
          )}
          <DetailDeleteButton id={n.id} kind="notifications" backHref="/notifications" />
        </div>
      </div>
    </div>
  );
}
