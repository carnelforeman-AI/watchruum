import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Poster } from "@/components/media/poster";
import { timeAgo } from "@/lib/utils";
import { YOUR_PROGRESS, FRIEND_ACTIVITY } from "@/lib/mock-data";
import { spoilerMeta } from "@/lib/spoiler";
import type { SpoilerState } from "@/lib/types";
import type { LibraryItem } from "@/lib/queries";

const LEGEND: SpoilerState[] = ["safe", "episode", "season", "series", "locked"];

export function RightRail({
  signedIn = false,
  progress = [],
  furthest = null,
}: {
  signedIn?: boolean;
  progress?: LibraryItem[];
  furthest?: LibraryItem | null;
}) {
  const rows: LibraryItem[] = signedIn
    ? progress
    : YOUR_PROGRESS.map((p) => ({
        media: p.media,
        season_number: p.season_number,
        episode_number: p.episode_number,
        label: p.label,
        percent: p.percent,
      }));

  const safeLabel = signedIn
    ? furthest
      ? `${furthest.media.title} ${furthest.label.replace(" · ", " ")}`
      : null
    : "Frontier Blood S2 E4";

  return (
    <aside className="hidden w-[320px] shrink-0 flex-col gap-4 py-6 pr-6 xl:flex">
      <RailCard title="Your Progress" href="/watchlist" hrefLabel="View library">
        {rows.length === 0 ? (
          <p className="text-[13px] leading-relaxed text-muted-2">
            You haven&apos;t started anything yet. Search a show and mark an episode watched to
            track your progress here.
          </p>
        ) : (
          <div className="space-y-4">
            {rows.slice(0, 3).map((p) => (
              <div key={p.media.id} className="flex items-center gap-3">
                <Poster
                  title={p.media.title}
                  src={p.media.poster_url}
                  genres={p.media.genres}
                  showTitle={false}
                  rounded="rounded-md"
                  className="h-12 w-9 shrink-0 ring-1 ring-white/10"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{p.media.title}</p>
                  <p className="text-[11px] text-muted-2">{p.label}</p>
                  <div className="mt-1.5 flex items-center gap-2">
                    <Progress value={p.percent} />
                    <span className="text-[11px] font-semibold text-muted">{p.percent}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </RailCard>

      <RailCard title="Friend Activity" href="/activity" hrefLabel="View all">
        <div className="space-y-3.5">
          {FRIEND_ACTIVITY.map((a) => (
            <div key={a.id} className="flex items-start gap-3">
              <Avatar name={a.actor.display_name} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="text-[13px] leading-tight">
                  <span className="font-semibold">{a.actor.display_name}</span>{" "}
                  <span className="text-muted">{a.verb}</span>
                  {a.score ? <span className="ml-1 font-semibold text-warn">★ {a.score}/10</span> : null}
                </p>
                <p className="truncate text-[12px] text-muted-2">{a.target}</p>
              </div>
              <span className="shrink-0 text-[11px] text-muted-2">{timeAgo(a.created_at)}</span>
            </div>
          ))}
        </div>
      </RailCard>

      <Card>
        <div className="p-5 pb-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-4 text-primary" />
            <h3 className="text-base font-semibold">Spoiler Protection</h3>
          </div>
          <p className="mt-0.5 text-[12px] text-muted-2">Your current progress</p>
        </div>
        <div className="p-5 pt-0">
          <div className="mb-4 rounded-xl border border-border bg-white/[0.03] p-3">
            <p className="text-[11px] text-muted-2">You&apos;re safe up to</p>
            <div className="mt-1 flex items-center justify-between gap-2">
              <p className="text-sm font-semibold">{safeLabel ?? "Nothing watched yet"}</p>
              {safeLabel && (
                <Badge variant="safe">
                  <ShieldCheck className="size-3" /> Safe Zone
                </Badge>
              )}
            </div>
          </div>
          <div className="space-y-2.5">
            {LEGEND.map((s) => {
              const m = spoilerMeta(s);
              return (
                <div key={s} className="flex items-center justify-between text-[12px]">
                  <span className="flex items-center gap-2">
                    <span className="size-2.5 rounded-full" style={{ background: m.color }} />
                    <span className="font-medium">{m.label}</span>
                  </span>
                  <span className="text-muted-2">{m.copy}</span>
                </div>
              );
            })}
          </div>
        </div>
      </Card>
    </aside>
  );
}

function RailCard({
  title,
  href,
  hrefLabel,
  children,
}: {
  title: string;
  href: string;
  hrefLabel: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <div className="flex items-center justify-between p-5 pb-3">
        <h3 className="text-base font-semibold">{title}</h3>
        <Link href={href} className="text-[12px] font-semibold text-primary hover:underline">
          {hrefLabel}
        </Link>
      </div>
      <div className="p-5 pt-0">{children}</div>
    </Card>
  );
}
