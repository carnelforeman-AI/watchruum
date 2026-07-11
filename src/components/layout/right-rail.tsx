import { Fragment } from "react";
import Link from "next/link";
import { ShieldCheck, Plus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Poster } from "@/components/media/poster";
import { cn, timeAgo } from "@/lib/utils";
import { spoilerMeta } from "@/lib/spoiler";
import type { SpoilerState, ActivityEvent } from "@/lib/types";
import type { LibraryItem, FriendOnline } from "@/lib/queries";

const LEGEND: SpoilerState[] = ["safe", "episode", "season", "series", "locked"];

export function RightRail({
  signedIn = false,
  progress = [],
  friendActivity = [],
  friendsOnline = [],
  safeUpTo = null,
}: {
  signedIn?: boolean;
  progress?: LibraryItem[];
  friendActivity?: ActivityEvent[];
  friendsOnline?: FriendOnline[];
  safeUpTo?: string | null;
}) {
  return (
    <aside className="hidden w-[320px] shrink-0 flex-col gap-4 py-6 pr-6 xl:flex">
      <RailCard title="Your Progress" href="/watchlist" hrefLabel="View library">
        {progress.length === 0 ? (
          <p className="text-[13px] leading-relaxed text-muted-2">
            You haven&apos;t started anything yet. Search a show and mark an episode watched to
            track your progress here.
          </p>
        ) : (
          <div className="space-y-4">
            {progress.slice(0, 3).map((p) => (
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

      {/* Combined Friends panel: Online (65%) + Activity (35%) */}
      <Card>
        <div className="flex items-center justify-between p-5 pb-3">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold">Friends Online</h3>
            <Link
              href="/friends"
              aria-label="Add friends"
              title="Add friends"
              className="grid size-6 place-items-center rounded-full border border-primary/40 bg-primary/10 text-primary transition-colors hover:bg-primary/20"
            >
              <Plus className="size-3.5" />
            </Link>
          </div>
          <Link href="/activity" className="text-[12px] font-semibold text-primary hover:underline">
            View all
          </Link>
        </div>
        <div className="flex h-[420px] flex-col px-2 pb-3">
          {/* Friends online — 65% */}
          <div className="min-h-0 flex-[65] overflow-y-auto px-3 no-scrollbar">
            <div className="space-y-3">
              {friendsOnline.map((f, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Avatar name={f.name} src={f.avatar} size="sm" />
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 text-[13px] font-semibold">
                      <span
                        className={cn(
                          "size-2 shrink-0 rounded-full",
                          f.status === "online" ? "bg-safe" : "bg-warn",
                        )}
                      />
                      <span className="truncate">{f.name}</span>
                    </p>
                    <p className="truncate text-[12px] text-muted-2">In {f.room} Room</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Friend activity — 35% */}
          <div className="mt-2 min-h-0 flex-[35] overflow-y-auto border-t border-border px-3 pt-3 no-scrollbar">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-2">
              Recent Activity
            </p>
            <div className="space-y-3">
              {friendActivity.map((a) => (
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
          </div>
        </div>
      </Card>

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
              <p className="text-sm font-semibold">{safeUpTo ?? "Nothing watched yet"}</p>
              {safeUpTo && (
                <Badge variant="safe">
                  <ShieldCheck className="size-3" /> Safe Zone
                </Badge>
              )}
            </div>
          </div>
          <div className="grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-2.5 text-[12px]">
            {LEGEND.map((s) => {
              const m = spoilerMeta(s);
              return (
                <Fragment key={s}>
                  <span className="flex items-center gap-2 whitespace-nowrap">
                    <span className="size-2.5 shrink-0 rounded-full" style={{ background: m.color }} />
                    <span className="font-medium">{m.label}</span>
                  </span>
                  <span className="text-right text-[11px] leading-tight text-muted-2">{m.copy}</span>
                </Fragment>
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
