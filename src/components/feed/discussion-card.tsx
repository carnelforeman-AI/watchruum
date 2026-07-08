import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { Poster } from "@/components/media/poster";
import { AvatarStack } from "@/components/ui/avatar";
import { compact, timeAgo } from "@/lib/utils";
import type { DiscussionCard as Discussion } from "@/lib/mock-data";

export function DiscussionCard({ d }: { d: Discussion }) {
  return (
    <Link
      href={`/title/${d.media.id}`}
      className="glass glass-hover flex items-stretch gap-3 rounded-2xl p-3"
    >
      <Poster
        title={d.media.title}
        src={d.media.poster_url}
        showTitle={false}
        className="h-[70px] w-[52px] shrink-0"
      />
      <div className="flex min-w-0 flex-1 flex-col justify-center">
        <p className="truncate text-[12px] font-medium text-muted">
          {d.media.title} <span className="text-muted-2">{d.scope}</span>
        </p>
        <p className="mt-0.5 truncate text-[15px] font-bold">{d.title}</p>
        <div className="mt-1 flex items-center gap-1.5 text-[12px] text-muted-2">
          <MessageCircle className="size-3.5" />
          {compact(d.comment_count)} comments
        </div>
      </div>
      <div className="flex shrink-0 flex-col items-end justify-between py-0.5">
        <span className="text-[11px] text-muted-2">{timeAgo(d.created_at)}</span>
        <AvatarStack names={d.participants} />
      </div>
    </Link>
  );
}
