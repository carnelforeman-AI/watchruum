import { ThumbsUp, MessageCircle, Star } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { scopeLabel } from "@/lib/spoiler";
import { compact } from "@/lib/utils";
import type { Review } from "@/lib/types";

/** Five-star row with fractional fill from a 1–10 score. */
function StarRow({ score }: { score: number }) {
  const outOfFive = score / 2;
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }, (_, i) => {
        const fill = Math.max(0, Math.min(1, outOfFive - i));
        return (
          <span key={i} className="relative inline-block">
            <Star className="size-4 text-white/15" />
            <span className="absolute inset-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
              <Star className="size-4 fill-warn text-warn" />
            </span>
          </span>
        );
      })}
    </div>
  );
}

export function ReviewCard({ review }: { review: Review }) {
  return (
    <div className="glass rounded-2xl p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Avatar name={review.author.display_name} size="sm" />
          <div>
            <p className="text-sm">
              <span className="font-semibold">{review.author.display_name}</span>{" "}
              <span className="text-muted">rated</span>{" "}
              <span className="font-medium">{review.media.title}</span>{" "}
              <span className="text-muted-2">
                {scopeLabel(review.season_number, review.episode_number)}
              </span>
            </p>
            {review.spoiler_scope === "none" ? (
              <Badge variant="safe" className="mt-1">Spoiler-Free</Badge>
            ) : (
              <Badge variant="warn" className="mt-1">Contains Spoilers</Badge>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-0.5">
          <StarRow score={review.score} />
          <span className="text-[12px] font-bold text-muted">{review.score.toFixed(1)}/10</span>
        </div>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-foreground/90">{review.body}</p>
      <div className="mt-3 flex items-center gap-4 text-[12px] text-muted-2">
        <span className="flex items-center gap-1.5">
          <ThumbsUp className="size-3.5" /> {compact(review.like_count)}
        </span>
        <span className="flex items-center gap-1.5">
          <MessageCircle className="size-3.5" /> {compact(review.comment_count)}
        </span>
      </div>
    </div>
  );
}
